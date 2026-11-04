import type { Express, Request, Response } from "express";
import { randomBytes, createHash } from "node:crypto";
import rateLimit from "express-rate-limit";
import { pool as defaultPool } from "./db";
import { getUserById } from "./customAuthService";
import { encodeWAV, validateProject, newProject } from "../packages/brightboard-media/src/engine";
import { renderMediaImage, renderMediaVideo, videoAvailable } from "./media-render";

export const hashMediaKey = (key: string) => createHash("sha256").update(key).digest("hex");
// Free launch: identical hosted-compute safety allowance for every account.
export const mediaDailyQuota = (_user?: unknown) => 100;
export function validateRenderRequest(body: any) {
  const p = validateProject(body?.project);
  const type = body.type;
  if (!["image", "audio", "video"].includes(type)) throw new Error("Choose image, audio or video.");
  const format = body.format || (type === "image" ? "png" : type === "audio" ? "wav" : "mp4");
  if (!(type === "image" ? ["png", "jpeg", "svg"] : type === "audio" ? ["wav"] : ["mp4"]).includes(format)) throw new Error("Unsupported output format.");
  const time = body.time ?? 0;
  if (typeof time !== "number" || !Number.isFinite(time) || time < 0 || time > 120) throw new Error("Time must be 0–120 seconds.");
  if (type === "image" && (p.width > 1920 || p.height > 1920 || p.width * p.height > 2_100_000)) throw new Error("API images support up to 1920 pixels per side and 2.1 megapixels; use the local editor for larger exports.");
  if (type === "audio" && p.duration > 30) throw new Error("API audio supports up to 30 seconds.");
  if (type === "video" && (p.width > 640 || p.height > 640 || p.width * p.height > 230400 || p.width % 2 || p.height % 2 || p.duration > 5)) throw new Error("API video supports even dimensions up to 640 pixels per side, 230,400 pixels total and 5 seconds.");
  return { p, type: type as "image" | "audio" | "video", format: format as "png" | "jpeg" | "svg" | "wav" | "mp4", time };
}
let rendering = 0;
export async function registerMediaAPI(app: Express, services: { pool?: typeof defaultPool; userById?: typeof getUserById; videoAvailable?: boolean } = {}) {
  const pool = services.pool || defaultPool;
  const userById = services.userById || getUserById;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS media_developer_keys (
      id TEXT PRIMARY KEY, user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL, prefix TEXT NOT NULL, key_hash TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), revoked_at TIMESTAMPTZ, last_used_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS media_keys_owner ON media_developer_keys(user_id);
    CREATE TABLE IF NOT EXISTS media_developer_usage (
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day DATE NOT NULL, used INTEGER NOT NULL DEFAULT 0 CHECK(used >= 0), PRIMARY KEY(user_id,day)
    );
  `);
  const available = services.videoAvailable ?? videoAvailable();
  app.use("/api/media", (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  const readUser = async (req: Request) => (req as any).session?.userId ? userById((req as any).session.userId) : null;
  const sameOrigin = (req: Request, res: Response) => {
    if (req.headers["sec-fetch-site"] === "cross-site") { res.status(403).json({ error: "Cross-site key management is not allowed." }); return false; }
    const origin = req.headers.origin;
    if (origin) {
      try { if (new URL(origin).host !== req.get("host")) throw new Error(); }
      catch { res.status(403).json({ error: "Origin is not allowed." }); return false; }
    }
    return true;
  };
  app.get("/api/media/developer", async (req, res) => {
    try {
      const user = await readUser(req);
      if (!user) return res.json({ authenticated: false, entitled: false, quotaDaily: 0, usedToday: 0, keys: [], videoAvailable: available });
      const keys = await pool.query(`SELECT id,label,prefix,created_at AS "createdAt",revoked_at AS "revokedAt" FROM media_developer_keys WHERE user_id=$1 ORDER BY (revoked_at IS NULL) DESC,created_at DESC LIMIT 30`, [user.id]);
      const usage = await pool.query(`SELECT used FROM media_developer_usage WHERE user_id=$1 AND day=$2`, [user.id, new Date().toISOString().slice(0, 10)]);
      res.json({ authenticated: true, entitled: true, quotaDaily: mediaDailyQuota(user), usedToday: usage.rows[0]?.used || 0, keys: keys.rows, videoAvailable: available });
    } catch { res.status(503).json({ error: "Developer account status could not be loaded." }); }
  });
  app.post("/api/media/keys", rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false }), async (req, res) => {
    if (!sameOrigin(req, res)) return;
    const client = await pool.connect();
    try {
      const user = await readUser(req);
      if (!user) return res.status(401).json({ error: "Sign in to manage developer keys." });
      const label = req.body?.label;
      if (typeof label !== "string" || !label.trim() || label.length > 80) return res.status(400).json({ error: "Enter a key name of 1–80 characters." });
      await client.query("BEGIN");
      await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
      const count = await client.query("SELECT COUNT(*) FROM media_developer_keys WHERE user_id=$1 AND revoked_at IS NULL", [user.id]);
      if (Number(count.rows[0].count) >= 3) { await client.query("ROLLBACK"); return res.status(409).json({ error: "Maximum three active keys. Revoke an old key first." }); }
      const key = `bbm_live_${randomBytes(32).toString("base64url")}`, id = randomBytes(16).toString("hex"), prefix = key.slice(0, 17);
      const result = await client.query(`INSERT INTO media_developer_keys(id,user_id,label,prefix,key_hash) VALUES($1,$2,$3,$4,$5) RETURNING created_at AS "createdAt"`, [id, user.id, label.trim(), prefix, hashMediaKey(key)]);
      await client.query("COMMIT");
      res.status(201).json({ id, key, prefix, label: label.trim(), createdAt: result.rows[0].createdAt });
    } catch {
      await client.query("ROLLBACK").catch(() => {});
      res.status(503).json({ error: "Could not create a developer key." });
    } finally { client.release(); }
  });
  app.delete("/api/media/keys/:id", async (req, res) => {
    if (!sameOrigin(req, res)) return;
    try {
      const user = await readUser(req);
      if (!user) return res.status(401).json({ error: "Sign in to manage developer keys." });
      const result = await pool.query("UPDATE media_developer_keys SET revoked_at=NOW() WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL RETURNING id", [req.params.id, user.id]);
      if (!result.rowCount) return res.status(404).json({ error: "Active key not found." });
      res.json({ revoked: true });
    } catch { res.status(503).json({ error: "Could not revoke this key." }); }
  });
  app.post("/api/media/v1/generate", rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false }), async (req, res) => {
    let chargedUser: string | number | undefined, day = new Date().toISOString().slice(0, 10), reserved = false;
    try {
      const token = req.headers.authorization?.match(/^Bearer (bbm_live_[A-Za-z0-9_-]{43})$/)?.[1];
      if (!token) return res.status(401).json({ error: "Use an active developer key in the Authorization Bearer header." });
      const keys = await pool.query("SELECT id,user_id FROM media_developer_keys WHERE key_hash=$1 AND revoked_at IS NULL", [hashMediaKey(token)]);
      const key = keys.rows[0];
      if (!key) return res.status(401).json({ error: "Developer key is invalid or revoked." });
      const user = await userById(key.user_id);
      if (!user) return res.status(401).json({ error: "The account for this key is no longer available." });
      let options: ReturnType<typeof validateRenderRequest>;
      try { options = validateRenderRequest(req.body); }
      catch (e) { return res.status(400).json({ error: (e as Error).message }); }
      if (options.type === "video" && !available) return res.status(503).json({ error: "Video rendering is unavailable on this host. Install FFmpeg with H.264/AAC support; the local browser editor remains available." });
      if (rendering >= 2) return res.status(429).json({ error: "Render capacity is busy. Retry shortly." });
      rendering++; reserved = true;
      const usage = await pool.query(`INSERT INTO media_developer_usage(user_id,day,used) VALUES($1,$2,1) ON CONFLICT(user_id,day) DO UPDATE SET used=media_developer_usage.used+1 WHERE media_developer_usage.used < $3 RETURNING used`, [user!.id, day, mediaDailyQuota(user)]);
      if (!usage.rowCount) return res.status(429).json({ error: "Daily API allowance reached. Resets at 00:00 UTC." });
      chargedUser = user!.id;
      const abort = new AbortController();
      res.once("close", () => { if (!res.writableEnded) abort.abort(); });
      const { p, type, format, time } = options;
      const data = type === "image" ? await renderMediaImage(p, format as "png" | "jpeg" | "svg", time)
        : type === "audio" ? Buffer.from(encodeWAV(p.audio, p.duration)) : await renderMediaVideo(p, abort.signal);
      if (abort.signal.aborted) throw new Error("Client disconnected.");
      await pool.query("UPDATE media_developer_keys SET last_used_at=NOW() WHERE id=$1", [key.id]);
      const mime = format === "png" ? "image/png" : format === "jpeg" ? "image/jpeg" : format === "svg" ? "image/svg+xml" : format === "wav" ? "audio/wav" : "video/mp4";
      res.setHeader("Content-Disposition", `attachment; filename="brightboard.${format === "jpeg" ? "jpg" : format}"`);
      res.setHeader("X-RateLimit-Daily-Remaining", String(mediaDailyQuota(user) - usage.rows[0].used));
      res.type(mime).send(data);
    } catch {
      if (chargedUser !== undefined) await pool.query("UPDATE media_developer_usage SET used=GREATEST(0,used-1) WHERE user_id=$1 AND day=$2", [chargedUser, day]).catch(() => {});
      if (!res.headersSent && !res.destroyed) res.status(503).json({ error: "Rendering failed; this request was not charged against your daily allowance. Try a smaller composition." });
    } finally { if (reserved) rendering--; }
  });
  app.get("/api/media/openapi.json", (_req, res) => res.json({
    openapi: "3.0.3", info: { title: "BrightBoard Procedural Media API", version: "1.0.0", description: "Free launch: account-owned keys, 100 requests/day and bounded server rendering. Local editor and SDK need no account or external generation service." },
    servers: [{ url: "/" }], components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } } },
    paths: { "/api/media/v1/generate": { post: { security: [{ bearerAuth: [] }], summary: "Generate a procedural image, PCM audio, or short MP4",
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["type", "project"], properties: { type: { type: "string", enum: ["image", "audio", "video"] }, format: { type: "string", enum: ["png", "jpeg", "svg", "wav", "mp4"] }, project: { type: "object" }, time: { type: "number", minimum: 0, maximum: 120 } } }, example: { type: "image", format: "png", project: newProject() } } } },
      responses: { "200": { description: "Binary media file", content: { "image/png": { schema: { type: "string", format: "binary" } }, "image/jpeg": { schema: { type: "string", format: "binary" } }, "image/svg+xml": { schema: { type: "string", format: "binary" } }, "audio/wav": { schema: { type: "string", format: "binary" } }, "video/mp4": { schema: { type: "string", format: "binary" } } } }, "400": { description: "Invalid project or output bounds" }, "401": { description: "Invalid or revoked key/account" }, "429": { description: "Free safety rate, quota or concurrency limit" }, "503": { description: "Rendering unavailable" } } } } }
  }));
}
