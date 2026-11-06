import type { Pool, PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { validateProject } from "../packages/brightboard-media/src/engine";
import { validLesson } from "../packages/brightboard-tv/src/helpers";

export const SHARE_LIMITS = { documentBytes: 16 * 1024 * 1024, accountBytes: 128 * 1024 * 1024, documents: 100, revisions: 50 };
export const SHARE_KINDS = ["editor", "tv", "image", "text", "presentation", "worksheet", "activity", "storyboard", "mindmap", "studio", "file"] as const;
export class ShareError extends Error {
  constructor(public status: number, message: string, public canRequest = false) { super(message); }
}
export const validShareId = (id: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id);
type Viewer = { id: string; email: string; emailVerified?: boolean };

export async function initializeDocumentSharing(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shared_documents (
      id uuid PRIMARY KEY, owner_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title varchar(200) NOT NULL, kind varchar(32) NOT NULL, revision uuid NOT NULL,
      audience varchar(16) NOT NULL DEFAULT 'invited', allow_requests boolean NOT NULL DEFAULT true,
      allow_download boolean NOT NULL DEFAULT false, include_private boolean NOT NULL DEFAULT false,
      enabled boolean NOT NULL DEFAULT true, expires_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS shared_documents_owner_idx ON shared_documents(owner_id);
    CREATE TABLE IF NOT EXISTS shared_document_versions (
      document_id uuid NOT NULL REFERENCES shared_documents(id) ON DELETE CASCADE,
      revision uuid NOT NULL, author_id varchar REFERENCES users(id) ON DELETE SET NULL,
      title varchar(200) NOT NULL, content bytea NOT NULL, byte_count integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(document_id, revision)
    );
    CREATE TABLE IF NOT EXISTS shared_document_members (
      id uuid PRIMARY KEY, document_id uuid NOT NULL REFERENCES shared_documents(id) ON DELETE CASCADE,
      email varchar(320) NOT NULL, role varchar(16) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(document_id,email)
    );
    CREATE TABLE IF NOT EXISTS shared_document_requests (
      document_id uuid NOT NULL REFERENCES shared_documents(id) ON DELETE CASCADE,
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message varchar(1000) NOT NULL DEFAULT '', status varchar(16) NOT NULL DEFAULT 'pending',
      updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(document_id,user_id)
    );
    CREATE TABLE IF NOT EXISTS shared_document_activity (
      id bigserial PRIMARY KEY, document_id uuid NOT NULL REFERENCES shared_documents(id) ON DELETE CASCADE,
      actor_id varchar REFERENCES users(id) ON DELETE SET NULL,
      action varchar(64) NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

const titleOf = (value: unknown) => {
  if (typeof value !== "string" || !value.trim() || value.length > 200) throw new ShareError(400, "Enter a document title of 1–200 characters.");
  return value.trim();
};
function settings(body: any) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ShareError(400, "Invalid sharing settings.");
  if (body.audience !== undefined && !["invited", "link"].includes(body.audience)) throw new ShareError(400, "Choose invited accounts or signed-in link recipients.");
  for (const key of ["allowRequests", "allowDownload", "includePrivate", "enabled"]) {
    if (body[key] !== undefined && typeof body[key] !== "boolean") throw new ShareError(400, `Invalid ${key} setting.`);
  }
  if (body.expiresAt !== undefined && body.expiresAt !== null &&
      (typeof body.expiresAt !== "string" || !Number.isFinite(Date.parse(body.expiresAt)) || Date.parse(body.expiresAt) <= Date.now())) {
    throw new ShareError(400, "Expiry must be a future date or no expiry.");
  }
}
const fileData = /^data:(image\/(?:png|jpeg|webp|gif|bmp|avif|tiff)|application\/pdf|audio\/[a-z0-9.+-]+|video\/[a-z0-9.+-]+|application\/(?:vnd\.openxmlformats-officedocument\.[a-z.]+|msword|octet-stream));base64,[A-Za-z0-9+/=\r\n]+$/i;

// Never store active HTML or executable server files. Structured fields are
// rendered as text by the viewer; binary documents are downloaded, not executed.
export function prepareSharedContent(kind: string, input: unknown, includePrivate: boolean) {
  if (!SHARE_KINDS.includes(kind as any)) throw new ShareError(400, "Unsupported document type.");
  let raw: string;
  try { raw = JSON.stringify(input); } catch { throw new ShareError(400, "Invalid document content."); }
  if (!raw || Buffer.byteLength(raw) > SHARE_LIMITS.documentBytes) throw new ShareError(413, "Shared documents are limited to 16 MB, including embedded assets.");
  let value = JSON.parse(raw);
  let nodes = 0;
  function clean(item: any, depth = 0, field = ""): any {
    if (++nodes > 250000 || depth > 40) throw new ShareError(400, "Document structure is too complex.");
    if (typeof item === "string") {
      // Temporary or remote assets are not durable shared copies.
      if (/^(blob:|javascript:|file:)/i.test(item)) throw new ShareError(400, "Embed local assets before sharing. Temporary or executable links are not supported.");
      if (/(image|photo|picture|thumbnail|src|url|background)/i.test(field) && /^(https?:\/\/|\/(?:generated|uploads|api)\/)/i.test(item)) {
        throw new ShareError(400, "An image or media asset has not been embedded. Save a complete snapshot before sharing.");
      }
      if (/^data:image\/svg/i.test(item)) throw new ShareError(400, "Convert uploaded SVG assets to PNG before sharing.");
      return item;
    }
    if (Array.isArray(item)) return item.map(v => clean(v, depth + 1, field));
    if (item && typeof item === "object") {
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(item)) {
        if (["__proto__", "constructor", "prototype"].includes(key)) continue;
        if (!includePrivate && /^(notes|privateNotes|presenterNotes|teacherNotes|answerKey|answerKeys|answer_key)$/i.test(key)) {
          if (key === "notes") out[key] = "";
          continue;
        }
        out[key] = clean(val, depth + 1, key);
      }
      return out;
    }
    return item;
  }
  // Teaching sources often wrap structured JSON in a string.
  if (value && typeof value.body === "string") {
    try { value.body = JSON.stringify(clean(JSON.parse(value.body))); } catch (error) {
      if (error instanceof ShareError) throw error;
    }
  }
  value = clean(value);
  if (kind === "image" && typeof value?.body === "string" && /^(https?:|\/|blob:)/i.test(value.body)) throw new ShareError(400, "Embed the image before sharing.");
  if (kind === "editor") {
    try { value = validateProject(value); } catch (error) { throw new ShareError(400, error instanceof Error ? error.message : "Invalid Editor project."); }
  }
  if (kind === "tv") {
    // Privacy filtering may omit notes entirely. The lesson format requires the
    // field even when empty, so retain structural validity without private data.
    if (!includePrivate && Array.isArray(value?.pages)) {
      value.pages = value.pages.map((page: any) => page && typeof page === "object" ? { ...page, notes: "" } : page);
    }
    if (!validLesson(value)) throw new ShareError(400, "This is not a complete supported BrightboardTV lesson.");
    if (value.pages.some((page: any) => page.model && !/^data:model\/gltf-binary;base64,/.test(page.model.src))) {
      throw new ShareError(400, "Embed the complete 3D model before sharing this lesson.");
    }
  }
  if (kind === "file") {
    if (!value || typeof value.name !== "string" || typeof value.data !== "string" || !fileData.test(value.data)) {
      throw new ShareError(400, "Upload a supported document, image, audio or video file.");
    }
    if (/\.(env|exe|sh|js|html?|svg|bat|cjs|mjs|php|py)$/i.test(value.name)) throw new ShareError(400, "Executable files and environment files cannot be shared.");
  }
  const json = JSON.stringify(value);
  if (Buffer.byteLength(json) > SHARE_LIMITS.documentBytes) throw new ShareError(413, "Shared document exceeds 16 MB.");
  return { content: gzipSync(json), bytes: Buffer.byteLength(json) };
}

export class DocumentSharingStore {
  constructor(private pool: Pool) {}
  private async transaction<T>(fn: (db: PoolClient) => Promise<T>) {
    const db = await this.pool.connect();
    try { await db.query("BEGIN"); const result = await fn(db); await db.query("COMMIT"); return result; }
    catch (error) { await db.query("ROLLBACK"); throw error; } finally { db.release(); }
  }
  private async record(db: PoolClient, id: string, actor: string, action: string) {
    await db.query("INSERT INTO shared_document_activity(document_id,actor_id,action) VALUES($1,$2,$3)", [id, actor, action]);
  }
  private async document(db: Pool | PoolClient, id: string, lock = false) {
    if (!validShareId(id)) throw new ShareError(404, "Shared document not found.");
    const { rows } = await db.query(`SELECT * FROM shared_documents WHERE id=$1${lock ? " FOR UPDATE" : ""}`, [id]);
    if (!rows[0]) throw new ShareError(404, "Shared document not found.");
    return rows[0];
  }
  private async role(db: Pool | PoolClient, doc: any, viewer: Viewer) {
    if (doc.owner_id === viewer.id) return "owner";
    if (!doc.enabled || (doc.expires_at && new Date(doc.expires_at).getTime() <= Date.now())) throw new ShareError(410, "This share has been disabled or has expired.");
    const { rows } = await db.query("SELECT role FROM shared_document_members WHERE document_id=$1 AND email=$2", [doc.id, viewer.email.toLowerCase()]);
    return rows[0]?.role || (doc.audience === "link" ? "viewer" : null);
  }
  private requireOwner(doc: any, viewer: Viewer) {
    if (doc.owner_id !== viewer.id) throw new ShareError(403, "Only the owner can manage this document.");
  }
  private async quota(db: PoolClient, owner: string, bytes: number, newDocument = false) {
    // Serialize quotas across every document owned by an account.
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`sharing:${owner}`]);
    const { rows } = await db.query(`SELECT (SELECT count(*) FROM shared_documents WHERE owner_id=$1) AS count,
      coalesce(sum(v.byte_count),0) AS bytes FROM shared_document_versions v JOIN shared_documents d ON d.id=v.document_id WHERE d.owner_id=$1`, [owner]);
    if ((newDocument && Number(rows[0].count) >= SHARE_LIMITS.documents) || Number(rows[0].bytes) + bytes > SHARE_LIMITS.accountBytes) {
      throw new ShareError(413, "Sharing storage limit reached: 100 documents or 128 MB including revisions. Download backups before deleting old documents.");
    }
  }
  async list(viewer: Viewer) {
    const { rows } = await this.pool.query(`SELECT d.id,d.title,d.kind,d.revision,d.updated_at,
      CASE WHEN d.owner_id=$1 THEN 'owner' ELSE m.role END AS role,
      CASE WHEN d.owner_id=$1 THEN (SELECT count(*)::int FROM shared_document_requests r WHERE r.document_id=d.id AND r.status='pending') ELSE 0 END AS pending_requests
      FROM shared_documents d LEFT JOIN shared_document_members m ON m.document_id=d.id AND m.email=$2
      WHERE d.owner_id=$1 OR (m.id IS NOT NULL AND d.enabled AND (d.expires_at IS NULL OR d.expires_at>now())) ORDER BY d.updated_at DESC`, [viewer.id, viewer.email.toLowerCase()]);
    return { documents: rows.map(r => ({ id: r.id, title: r.title, kind: r.kind, revision: r.revision, updatedAt: r.updated_at, role: r.role, pendingRequests: r.pending_requests })), limits: SHARE_LIMITS };
  }
  async create(viewer: Viewer, body: any) {
    settings(body);
    const title = titleOf(body.title), packed = prepareSharedContent(body.kind, body.content, body.includePrivate === true);
    const id = randomUUID(), revision = randomUUID();
    await this.transaction(async db => {
      await this.quota(db, viewer.id, packed.bytes, true);
      await db.query(`INSERT INTO shared_documents(id,owner_id,title,kind,revision,audience,allow_requests,allow_download,include_private,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [id, viewer.id, title, body.kind, revision, body.audience || "invited", body.allowRequests !== false, body.allowDownload === true, body.includePrivate === true, body.expiresAt || null]);
      await db.query("INSERT INTO shared_document_versions(document_id,revision,author_id,title,content,byte_count) VALUES($1,$2,$3,$4,$5,$6)", [id, revision, viewer.id, title, packed.content, packed.bytes]);
      await this.record(db, id, viewer.id, "created");
    });
    return this.get(viewer, id);
  }
  async get(viewer: Viewer, id: string, revision?: string) {
    const doc = await this.document(this.pool, id), role = await this.role(this.pool, doc, viewer);
    if (!role) throw new ShareError(403, "You need permission to open this shared document.", doc.allow_requests);
    if (revision && !validShareId(revision)) throw new ShareError(400, "Invalid revision.");
    const { rows } = await this.pool.query("SELECT * FROM shared_document_versions WHERE document_id=$1 AND revision=$2", [id, revision || doc.revision]);
    if (!rows[0]) throw new ShareError(404, "This revision was not found.");
    const version = rows[0];
    const versions = await this.pool.query("SELECT revision,created_at FROM shared_document_versions WHERE document_id=$1 ORDER BY created_at DESC", [id]);
    const result: any = {
      id, title: version.title, kind: doc.kind, content: JSON.parse(gunzipSync(version.content, { maxOutputLength: SHARE_LIMITS.documentBytes }).toString()),
      revision: version.revision, latestRevision: doc.revision, role,
      audience: doc.audience, allowRequests: doc.allow_requests, allowDownload: doc.allow_download, includePrivate: doc.include_private,
      enabled: doc.enabled, expiresAt: doc.expires_at, updatedAt: doc.updated_at,
      versions: versions.rows.map(r => ({ revision: r.revision, createdAt: r.created_at })),
      members: [], requests: [], activity: [],
    };
    if (role === "owner") {
      result.members = (await this.pool.query("SELECT id,email,role FROM shared_document_members WHERE document_id=$1 ORDER BY created_at", [id])).rows;
      result.requests = (await this.pool.query(`SELECT r.user_id AS "userId", coalesce(nullif(u.first_name,''),'BrightBoard user') AS name,
        r.message,r.status FROM shared_document_requests r JOIN users u ON u.id=r.user_id WHERE r.document_id=$1 ORDER BY r.updated_at DESC`, [id])).rows;
      result.activity = (await this.pool.query(`SELECT a.action,a.created_at AS "createdAt",coalesce(nullif(u.first_name,''),'BrightBoard user') AS "actorName"
        FROM shared_document_activity a LEFT JOIN users u ON u.id=a.actor_id WHERE a.document_id=$1 ORDER BY a.id DESC LIMIT 50`, [id])).rows;
    }
    return result;
  }
  async save(viewer: Viewer, id: string, body: any, expected?: string) {
    await this.transaction(async db => {
      const doc = await this.document(db, id, true), role = await this.role(db, doc, viewer);
      if (!["owner", "editor"].includes(role || "")) throw new ShareError(403, "Editing requires the owner's approval.");
      if (!expected || expected.replace(/^"|"$/g, "") !== doc.revision) throw new ShareError(409, "A newer revision exists. Your local changes have not been published. Reload or save a separate copy.");
      const title = titleOf(body.title), packed = prepareSharedContent(doc.kind, body.content, doc.include_private), revision = randomUUID();
      const count = await db.query("SELECT count(*) FROM shared_document_versions WHERE document_id=$1", [id]);
      if (Number(count.rows[0].count) >= SHARE_LIMITS.revisions) throw new ShareError(413, "This document has 50 revisions. Save a separate document to continue; previous versions remain intact.");
      await this.quota(db, doc.owner_id, packed.bytes);
      await db.query("INSERT INTO shared_document_versions(document_id,revision,author_id,title,content,byte_count) VALUES($1,$2,$3,$4,$5,$6)", [id, revision, viewer.id, title, packed.content, packed.bytes]);
      await db.query("UPDATE shared_documents SET title=$2,revision=$3,updated_at=now() WHERE id=$1", [id, title, revision]);
      await this.record(db, id, viewer.id, "published revision");
    });
    return this.get(viewer, id);
  }
  async configure(viewer: Viewer, id: string, body: any) {
    settings(body);
    await this.transaction(async db => {
      const doc = await this.document(db, id, true); this.requireOwner(doc, viewer);
      // Private data removed in older snapshots cannot be restored by a toggle.
      await db.query(`UPDATE shared_documents SET audience=$2,allow_requests=$3,allow_download=$4,enabled=$5,expires_at=$6,updated_at=now() WHERE id=$1`,
        [id, body.audience ?? doc.audience, body.allowRequests ?? doc.allow_requests, body.allowDownload ?? doc.allow_download, body.enabled ?? doc.enabled,
          body.expiresAt === undefined ? doc.expires_at : body.expiresAt]);
      await this.record(db, id, viewer.id, "changed sharing settings");
    });
    return this.get(viewer, id);
  }
  async invite(viewer: Viewer, id: string, body: any) {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320 || !["viewer", "editor"].includes(body.role)) throw new ShareError(400, "Enter an email and choose viewer or editor access.");
    await this.transaction(async db => {
      const doc = await this.document(db, id, true); this.requireOwner(doc, viewer);
      const count = await db.query("SELECT count(*) FROM shared_document_members WHERE document_id=$1", [id]);
      if (Number(count.rows[0].count) >= 100) throw new ShareError(413, "A document supports up to 100 invited accounts.");
      await db.query(`INSERT INTO shared_document_members(id,document_id,email,role) VALUES($1,$2,$3,$4)
        ON CONFLICT(document_id,email) DO UPDATE SET role=excluded.role`, [randomUUID(), id, email, body.role]);
      await this.record(db, id, viewer.id, "invited account");
    });
    return this.get(viewer, id);
  }
  async removeMember(viewer: Viewer, id: string, memberId: string) {
    if (!validShareId(memberId)) throw new ShareError(400, "Invalid invitation.");
    await this.transaction(async db => {
      const doc = await this.document(db, id, true); this.requireOwner(doc, viewer);
      await db.query("DELETE FROM shared_document_members WHERE document_id=$1 AND id=$2", [id, memberId]);
      await this.record(db, id, viewer.id, "revoked account access");
    });
    return this.get(viewer, id);
  }
  async request(viewer: Viewer, id: string, body: any) {
    if (typeof body.message !== "string" || body.message.length > 1000) throw new ShareError(400, "Requests can include up to 1,000 characters.");
    await this.transaction(async db => {
      const doc = await this.document(db, id, true);
      await this.role(db, doc, viewer); // validates enabled / expiry even without read access
      if (!doc.allow_requests) throw new ShareError(403, "This owner is not accepting edit requests.");
      if (doc.owner_id === viewer.id) throw new ShareError(400, "You already own this document.");
      const current = await db.query("SELECT updated_at FROM shared_document_requests WHERE document_id=$1 AND user_id=$2", [id, viewer.id]);
      if (current.rows[0] && Date.now() - new Date(current.rows[0].updated_at).getTime() < 60_000) throw new ShareError(429, "Your request was recorded. Please wait before requesting again.");
      await db.query(`INSERT INTO shared_document_requests(document_id,user_id,message) VALUES($1,$2,$3)
        ON CONFLICT(document_id,user_id) DO UPDATE SET message=excluded.message,status='pending',updated_at=now()`, [id, viewer.id, body.message]);
      await this.record(db, id, viewer.id, "requested editing access");
    });
    return { success: true, message: "Request sent. The owner can review it in Shared documents." };
  }
  async decide(viewer: Viewer, id: string, userId: string, body: any) {
    if (!["approve", "decline"].includes(body.decision)) throw new ShareError(400, "Choose approve or decline.");
    await this.transaction(async db => {
      const doc = await this.document(db, id, true); this.requireOwner(doc, viewer);
      const { rows } = await db.query(`SELECT u.email FROM shared_document_requests r JOIN users u ON u.id=r.user_id WHERE r.document_id=$1 AND r.user_id=$2 AND r.status='pending'`, [id, userId]);
      if (!rows[0]) throw new ShareError(404, "Pending request not found.");
      if (body.decision === "approve") await db.query(`INSERT INTO shared_document_members(id,document_id,email,role) VALUES($1,$2,$3,'editor')
        ON CONFLICT(document_id,email) DO UPDATE SET role='editor'`, [randomUUID(), id, rows[0].email.toLowerCase()]);
      await db.query("UPDATE shared_document_requests SET status=$3,updated_at=now() WHERE document_id=$1 AND user_id=$2", [id, userId, body.decision === "approve" ? "approved" : "declined"]);
      await this.record(db, id, viewer.id, `${body.decision}d edit request`);
    });
    return this.get(viewer, id);
  }
  async remove(viewer: Viewer, id: string) {
    await this.transaction(async db => {
      const doc = await this.document(db, id, true); this.requireOwner(doc, viewer);
      await db.query("DELETE FROM shared_documents WHERE id=$1", [id]);
    });
  }
  async fork(viewer: Viewer, id: string) {
    const document = await this.get(viewer, id);
    if (document.role !== "owner" && !document.allowDownload) throw new ShareError(403, "The owner has not allowed copies or downloads.");
    return this.create(viewer, { kind: document.kind, title: `Copy of ${document.title}`.slice(0, 200), content: document.content, includePrivate: document.includePrivate });
  }
}
