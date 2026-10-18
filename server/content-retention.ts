import { pool } from "./db";
import type { GeneratedContent, InsertGeneratedContent } from "@shared/schema";

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
    CREATE INDEX IF NOT EXISTS generated_content_owner_created_idx ON generated_content(user_id,created_at);`)
      .catch(error => { initialized = undefined; throw error; });
  }
  return initialized;
}

export class RecentContentStore {
  async getContentByUser(userId: string): Promise<GeneratedContent[]> {
    await prepare();
    const result = await pool.query(`SELECT ${columns} FROM generated_content
      WHERE user_id=$1 AND created_at > (now() AT TIME ZONE 'UTC') - interval '24 hours'
      ORDER BY created_at DESC,id DESC`, [userId]);
    return result.rows;
  }
  async getContent(id: number): Promise<GeneratedContent | undefined> {
    await prepare();
    const result = await pool.query(`SELECT ${columns} FROM generated_content
      WHERE id=$1 AND created_at > (now() AT TIME ZONE 'UTC') - interval '24 hours'`, [id]);
    return result.rows[0];
  }
  async createContent(content: InsertGeneratedContent): Promise<GeneratedContent> {
    await prepare();
    const result = await pool.query(`INSERT INTO generated_content
      (user_id,type,prompt,title,content,created_at)
      VALUES($1,$2,$3,$4,$5,now() AT TIME ZONE 'UTC') RETURNING ${columns}`,
    [content.userId ?? null, content.type, content.prompt, content.title, content.content]);
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

export function startContentCleanup(store: RecentContentStore) {
  const clean = () => { void store.purgeExpired().catch(error => console.error("[Content retention] Cleanup failed", error)); };
  clean();
  const timer = setInterval(clean, 5 * 60_000);
  timer.unref();
  return () => clearInterval(timer);
}
