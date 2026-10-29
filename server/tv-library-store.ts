import type { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";
import type { Lesson } from "../packages/brightboard-tv/src/types";
import { MAX_LESSON_FILE, validLesson } from "../packages/brightboard-tv/src/helpers";

const compress = promisify(gzip), decompress = promisify(gunzip);
export const TV_LIBRARY_LIMITS = { maxLessons: 100, maxBytes: 256 * 1024 * 1024, maxLessonBytes: MAX_LESSON_FILE };
export type LibraryEntry = { id: string; title: string; pageCount: number; updatedAt: string; bytes: number; revision: string };
export class LibraryError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const validLibraryId = (id: string) => /^[a-zA-Z0-9_-]{1,120}$/.test(id);

export async function initializeTVLibrary(pool: Pool) {
  // Intentionally saved copies have no expiry and are not recent generations.
  // Binary assets stay private: no static directory, public bucket or signed URL.
  await pool.query(`CREATE TABLE IF NOT EXISTS tv_libraries (
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id varchar(120) NOT NULL,
    title varchar(200) NOT NULL,
    page_count integer NOT NULL CHECK(page_count BETWEEN 1 AND 20),
    byte_count integer NOT NULL CHECK(byte_count BETWEEN 1 AND 67108864),
    document bytea NOT NULL,
    revision uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(user_id, lesson_id)
  )`);
}
function entry(row: any): LibraryEntry {
  return { id: row.lesson_id, title: row.title, pageCount: row.page_count,
    bytes: row.byte_count, updatedAt: new Date(row.updated_at).toISOString(), revision: row.revision };
}
export class TVLibraryStore {
  constructor(private pool: Pool, private limits = TV_LIBRARY_LIMITS) {}
  async list(userId: string) {
    const result = await this.pool.query(`SELECT lesson_id,title,page_count,byte_count,updated_at,revision
      FROM tv_libraries WHERE user_id=$1 ORDER BY updated_at DESC`, [userId]);
    const lessons = result.rows.map(entry);
    return { lessons, usage: { lessons: lessons.length, bytes: lessons.reduce((sum, item) => sum + item.bytes, 0) }, limits: this.limits };
  }
  private async decode(row: any): Promise<Lesson> {
    const raw = await decompress(row.document, { maxOutputLength: this.limits.maxLessonBytes });
    return { ...JSON.parse(raw.toString("utf8")), title: row.title, updatedAt: new Date(row.updated_at).toISOString() };
  }
  async get(userId: string, id: string) {
    const { rows } = await this.pool.query("SELECT * FROM tv_libraries WHERE user_id=$1 AND lesson_id=$2", [userId, id]);
    if (!rows[0]) throw new LibraryError(404, "Saved lesson not found.");
    return { lesson: await this.decode(rows[0]), revision: rows[0].revision as string };
  }
  async save(userId: string, id: string, value: unknown, revision?: string) {
    let valid = false;
    try { valid = validLesson(value); } catch { /* malformed nested fields are invalid too */ }
    if (!valid || !validLibraryId(id) || (value as Lesson).id !== id) throw new LibraryError(400, "This is not a valid BrightboardTV lesson.");
    const lesson = value as Lesson;
    if (lesson.pages.length > 20) throw new LibraryError(400, "Paid lessons can contain at most 20 pages.");
    const raw = Buffer.from(JSON.stringify({ ...lesson, updatedAt: new Date().toISOString() }));
    if (raw.length > this.limits.maxLessonBytes) throw new LibraryError(413, "Lesson is larger than 64 MB. Download a backup and reduce embedded assets.");
    const document = await compress(raw);
    return this.mutate(userId, async client => {
      const old = await client.query("SELECT revision FROM tv_libraries WHERE user_id=$1 AND lesson_id=$2", [userId, id]);
      this.checkRevision(old.rows[0], revision);
      const { rows: [usage] } = await client.query("SELECT count(*)::int AS count, COALESCE(sum(byte_count),0)::bigint AS bytes FROM tv_libraries WHERE user_id=$1 AND lesson_id<>$2", [userId, id]);
      if (usage.count >= this.limits.maxLessons || Number(usage.bytes) + raw.length > this.limits.maxBytes) {
        throw new LibraryError(413, "Account library is full (100 lessons / 256 MB). Export copies and remove saved lessons before retrying.");
      }
      const { rows: [saved] } = await client.query(`INSERT INTO tv_libraries(user_id,lesson_id,title,page_count,byte_count,document,revision)
        VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(user_id,lesson_id) DO UPDATE SET
        title=EXCLUDED.title,page_count=EXCLUDED.page_count,byte_count=EXCLUDED.byte_count,
        document=EXCLUDED.document,revision=EXCLUDED.revision,updated_at=clock_timestamp() RETURNING *`,
        [userId, id, lesson.title, lesson.pages.length, raw.length, document, randomUUID()]);
      return entry(saved);
    });
  }
  private checkRevision(old: { revision: string } | undefined, revision?: string) {
    if ((old && old.revision !== revision) || (!old && revision)) throw new LibraryError(409, "This saved lesson changed on another device. Refresh the library before retrying. Export your current work first.");
  }
  async rename(userId: string, id: string, title: unknown, revision?: string) {
    if (typeof title !== "string" || !title.trim() || title.trim().length > 200) throw new LibraryError(400, "Use a lesson title between 1 and 200 characters.");
    return this.mutate(userId, async client => {
      const { rows: [old] } = await client.query("SELECT * FROM tv_libraries WHERE user_id=$1 AND lesson_id=$2", [userId, id]);
      if (!old) throw new LibraryError(404, "Saved lesson not found.");
      this.checkRevision(old, revision);
      const raw = Buffer.from(JSON.stringify({ ...await this.decode(old), title: title.trim() }));
      const { rows: [usage] } = await client.query("SELECT COALESCE(sum(byte_count),0)::bigint AS bytes FROM tv_libraries WHERE user_id=$1 AND lesson_id<>$2", [userId, id]);
      if (raw.length > this.limits.maxLessonBytes || Number(usage.bytes) + raw.length > this.limits.maxBytes) {
        throw new LibraryError(413, "Renaming would exceed your lesson or account storage limit. Use a shorter title or free library space.");
      }
      const { rows: [saved] } = await client.query(`UPDATE tv_libraries SET title=$3,revision=$4,document=$5,byte_count=$6,updated_at=clock_timestamp()
        WHERE user_id=$1 AND lesson_id=$2 RETURNING *`, [userId, id, title.trim(), randomUUID(), await compress(raw), raw.length]);
      return entry(saved);
    });
  }
  async delete(userId: string, id: string, revision?: string) {
    return this.mutate(userId, async client => {
      const { rows: [old] } = await client.query("SELECT revision FROM tv_libraries WHERE user_id=$1 AND lesson_id=$2", [userId, id]);
      if (!old) throw new LibraryError(404, "Saved lesson not found.");
      this.checkRevision(old, revision);
      await client.query("DELETE FROM tv_libraries WHERE user_id=$1 AND lesson_id=$2", [userId, id]);
    });
  }
  private async mutate<T>(userId: string, run: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // All processes serialize writes for this account, including quota checks.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,23))", [userId]);
      const result = await run(client);
      await client.query("COMMIT");
      return result;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
}
