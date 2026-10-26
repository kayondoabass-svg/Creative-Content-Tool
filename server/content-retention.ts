import { pool } from "./db";
import type { ExactLogoSources, GeneratedContent, InsertGeneratedContent } from "@shared/schema";
import { MAX_LOGO_SOURCE_BYTES, MAX_USER_LOGO_SOURCE_BYTES, validateLogoSources } from "./exactLogoService";

export const CONTENT_RETENTION_HOURS = 24;
let initialized: Promise<unknown> | undefined;
const columns = `id,user_id AS "userId",type,prompt,title,content,created_at AT TIME ZONE 'UTC' AS "createdAt"`;

function prepare() {
  if (!initialized) {
    initialized = pool.query(`CREATE TABLE IF NOT EXISTS generated_content (
      id serial PRIMARY KEY, user_id text, type text NOT NULL, prompt text NOT NULL,
      title text NOT NULL, content text NOT NULL,
      created_at timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
    );
    ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS user_id text;
    CREATE INDEX IF NOT EXISTS generated_content_owner_created_idx ON generated_content(user_id,created_at);
    CREATE TABLE IF NOT EXISTS exact_logo_sources (
      content_id integer PRIMARY KEY REFERENCES generated_content(id) ON DELETE CASCADE,
      assets text NOT NULL, byte_size integer NOT NULL
    );`)
      .catch(error => { initialized = undefined; throw error; });
  }
  return initialized;
}

export class RecentContentStore {
  private async withEditability(rows: GeneratedContent[]): Promise<GeneratedContent[]> {
    if (!rows.length) return rows;
    const available = await pool.query("SELECT content_id FROM exact_logo_sources WHERE content_id=ANY($1::int[])", [rows.map(row => row.id)]);
    const ids = new Set(available.rows.map(row => row.content_id));
    return rows.map(row => {
      if (row.type !== "image") return row;
      const data = JSON.parse(row.content);
      data.logoEditable = ids.has(row.id);
      return { ...row, content: JSON.stringify(data) };
    });
  }
  async getContentByUser(userId: string): Promise<GeneratedContent[]> {
    await prepare();
    const result = await pool.query(`SELECT ${columns} FROM generated_content
      WHERE user_id=$1 AND created_at > (now() AT TIME ZONE 'UTC') - interval '24 hours'
      ORDER BY created_at DESC,id DESC`, [userId]);
    return this.withEditability(result.rows);
  }
  async getContent(id: number): Promise<GeneratedContent | undefined> {
    await prepare();
    const result = await pool.query(`SELECT ${columns} FROM generated_content
      WHERE id=$1 AND created_at > (now() AT TIME ZONE 'UTC') - interval '24 hours'`, [id]);
    return (await this.withEditability(result.rows))[0];
  }
  async createContent(content: InsertGeneratedContent, sources?: ExactLogoSources): Promise<GeneratedContent> {
    if (sources) {
      if (!content.userId || content.type !== "image") throw new Error("Editable designs require an owner.");
      // Editing sources are optional. A storage budget must never discard a
      // finished design after the teacher has already waited for generation.
      if (Buffer.byteLength(JSON.stringify(sources)) > MAX_LOGO_SOURCE_BYTES) sources = undefined;
      else validateLogoSources(sources);
    }
    const finishedContent = content.type === "image"
      ? JSON.stringify({ ...JSON.parse(content.content), logoEditable: !!sources })
      : content.content;
    await prepare();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Serialise source eviction per teacher so concurrent generations stay bounded.
      if (sources) await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [content.userId]);
      const result = await client.query(`INSERT INTO generated_content
      (user_id,type,prompt,title,content,created_at)
      VALUES($1,$2,$3,$4,$5,now() AT TIME ZONE 'UTC') RETURNING ${columns}`,
      [content.userId ?? null, content.type, content.prompt, content.title, finishedContent]);
      if (sources) {
        const assets = JSON.stringify(sources);
        await client.query("INSERT INTO exact_logo_sources(content_id,assets,byte_size) VALUES($1,$2,$3)",
          [result.rows[0].id, assets, Buffer.byteLength(assets)]);
        // Keep the newest sources within the per-account budget, without deleting
        // any finished designs or extending their original expiry.
        await client.query(`DELETE FROM exact_logo_sources WHERE content_id IN (
          SELECT content_id FROM (
            SELECT s.content_id, sum(s.byte_size) OVER (ORDER BY c.created_at DESC,c.id DESC) AS total
            FROM exact_logo_sources s JOIN generated_content c ON c.id=s.content_id
            WHERE c.user_id=$1
          ) ranked WHERE total > $2
        )`, [content.userId, MAX_USER_LOGO_SOURCE_BYTES]);
      }
      await client.query("COMMIT");
      const row = result.rows[0];
      if (sources) row.content = JSON.stringify({ ...JSON.parse(row.content), logoEditable: true });
      return row;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async getLogoSources(id: number, userId: string): Promise<ExactLogoSources | undefined> {
    await prepare();
    const result = await pool.query(`SELECT s.assets FROM exact_logo_sources s
      JOIN generated_content c ON c.id=s.content_id
      WHERE c.id=$1 AND c.user_id=$2 AND c.type='image'
      AND c.created_at > (now() AT TIME ZONE 'UTC') - interval '24 hours'`, [id, userId]);
    return result.rows[0] ? JSON.parse(result.rows[0].assets) : undefined;
  }
  async updateLogoComposition(id: number, userId: string, content: string): Promise<GeneratedContent | undefined> {
    await prepare();
    // Recheck ownership, expiry and source presence after composition; deletion
    // or eviction during processing must never recreate a removed design.
    const result = await pool.query(`UPDATE generated_content SET content=$3
      WHERE id=$1 AND user_id=$2 AND type='image'
      AND created_at > (now() AT TIME ZONE 'UTC') - interval '24 hours'
      AND EXISTS (SELECT 1 FROM exact_logo_sources WHERE content_id=$1)
      RETURNING ${columns}`, [id, userId, content]);
    return result.rows[0];
  }
  async deleteContent(id: number, userId?: string): Promise<void> {
    if (!userId) throw new Error("A content owner is required.");
    await prepare();
    await pool.query("DELETE FROM generated_content WHERE id=$1 AND user_id=$2", [id, userId]);
  }
  async purgeExpired(): Promise<void> {
    await prepare();
    // Do not delete old unowned legacy rows whose ownership is unknown.
    await pool.query(`DELETE FROM generated_content WHERE user_id IS NOT NULL
      AND created_at <= (now() AT TIME ZONE 'UTC') - interval '24 hours'`);
  }
}

export function startContentCleanup(store: Pick<RecentContentStore, "purgeExpired">) {
  const clean = () => { void store.purgeExpired().catch(error => console.error("[Content retention] Cleanup failed", error)); };
  clean();
  const timer = setInterval(clean, 5 * 60_000);
  timer.unref();
  return () => clearInterval(timer);
}
