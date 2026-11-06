-- D1 enables foreign keys; mutation guards deliberately abort whole batches.
CREATE TABLE IF NOT EXISTS mutation_guards (value INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS documents (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, title TEXT NOT NULL, kind TEXT NOT NULL,
 revision TEXT NOT NULL, audience TEXT NOT NULL, allow_requests INTEGER NOT NULL,
 allow_download INTEGER NOT NULL, include_private INTEGER NOT NULL, enabled INTEGER NOT NULL DEFAULT 1,
 expires_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS documents_owner ON documents(owner_id);
CREATE TABLE IF NOT EXISTS versions (
 document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
 revision TEXT NOT NULL, author_id TEXT NOT NULL, title TEXT NOT NULL,
 object_key TEXT NOT NULL UNIQUE, byte_count INTEGER NOT NULL, sha256 TEXT NOT NULL,
 created_at TEXT NOT NULL, PRIMARY KEY(document_id,revision)
);
CREATE TABLE IF NOT EXISTS members (
 id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
 email TEXT NOT NULL, role TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(document_id,email)
);
CREATE INDEX IF NOT EXISTS members_email ON members(email);
CREATE TABLE IF NOT EXISTS requests (
 document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE, user_id TEXT NOT NULL,
 email TEXT NOT NULL, name TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
 updated_at TEXT NOT NULL, PRIMARY KEY(document_id,user_id)
);
CREATE TABLE IF NOT EXISTS activity (
 id INTEGER PRIMARY KEY AUTOINCREMENT, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
 actor_id TEXT NOT NULL, actor_name TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS nonces (nonce TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS deletion_queue (object_key TEXT PRIMARY KEY, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS maintenance_state (name TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS activity_retention AFTER INSERT ON activity
BEGIN DELETE FROM activity WHERE document_id=NEW.document_id AND id NOT IN
 (SELECT id FROM activity WHERE document_id=NEW.document_id ORDER BY id DESC LIMIT 200); END;
CREATE TRIGGER IF NOT EXISTS document_quota BEFORE INSERT ON documents
WHEN (SELECT count(*) FROM documents WHERE owner_id=NEW.owner_id)>=100
BEGIN SELECT RAISE(ABORT,'SHARING_DOCUMENT_LIMIT'); END;
CREATE TRIGGER IF NOT EXISTS version_quota BEFORE INSERT ON versions
WHEN (SELECT count(*) FROM versions WHERE document_id=NEW.document_id)>=50
 OR COALESCE((SELECT sum(v.byte_count) FROM versions v JOIN documents d ON d.id=v.document_id
 WHERE d.owner_id=(SELECT owner_id FROM documents WHERE id=NEW.document_id)),0)+NEW.byte_count>134217728
BEGIN SELECT RAISE(ABORT,'SHARING_STORAGE_LIMIT'); END;
CREATE TRIGGER IF NOT EXISTS member_quota BEFORE INSERT ON members
WHEN NOT EXISTS(SELECT 1 FROM members WHERE document_id=NEW.document_id AND email=NEW.email)
 AND (SELECT count(*) FROM members WHERE document_id=NEW.document_id)>=100
BEGIN SELECT RAISE(ABORT,'SHARING_MEMBER_LIMIT'); END;
