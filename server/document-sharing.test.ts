import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import express from "express";
import { randomUUID } from "node:crypto";
import { initializeDocumentSharing, DocumentSharingStore, prepareSharedContent, ShareError } from "./document-sharing-store";
import { registerDocumentSharing } from "./document-sharing-routes";
import { newProject } from "../packages/brightboard-media/src/engine";
import { newLesson } from "../packages/brightboard-tv/src/types";
import { prepareShareSnapshot } from "../client/src/lib/sharing";

test("sharing validation rejects executable, temporary and fragile assets", () => {
  for (const content of [
    { name: ".env", data: "data:application/octet-stream;base64,QUJD" },
    { name: "unsafe.html", data: "data:application/octet-stream;base64,QUJD" },
    { name: "unsafe.svg", data: "data:image/svg+xml;base64,QUJD" },
  ]) assert.throws(() => prepareSharedContent("file", content, false));
  assert.throws(() => prepareSharedContent("image", { body: "https://example.invalid/image.png" }, false));
  assert.throws(() => prepareSharedContent("studio", { imageUrl: "blob:expired" }, false));
  assert.throws(() => prepareSharedContent("tv", { pages: [] }, false));
  assert.throws(() => prepareSharedContent("editor", {}, false));
  assert.doesNotThrow(() => prepareSharedContent("file", { name: "lesson.pdf", mime: "application/pdf", data: "data:application/pdf;base64,QUJD" }, false));
});
test("privacy-filtered client TV snapshots keep the required lesson structure", async () => {
  const lesson = newLesson(); lesson.pages[0].notes = "private presenter notes";
  const prepared = await prepareShareSnapshot(lesson, "tv", false);
  assert.equal(prepared.pages[0].notes, undefined);
  assert.doesNotThrow(() => prepareSharedContent("tv", prepared, false));
});

test("complete authenticated sharing lifecycle and cross-account isolation", { skip: !process.env.DATABASE_URL }, async t => {
  const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const schema = `sharing_test_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}` });
  let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;
  const owner = { id: "owner", email: "owner@example.invalid", emailVerified: true };
  const reader = { id: "reader", email: "reader@example.invalid", emailVerified: true };
  const other = { id: "other", email: "other@example.invalid", emailVerified: true };
  try {
    await pool.query("CREATE TABLE users(id varchar PRIMARY KEY,email varchar,first_name varchar)");
    await pool.query("INSERT INTO users VALUES('owner','owner@example.invalid','Owner'),('reader','reader@example.invalid','Reader'),('other','other@example.invalid','Other')");
    await initializeDocumentSharing(pool);
    await initializeDocumentSharing(pool);
    const store = new DocumentSharingStore(pool);
    const project = newProject();
    const doc = await store.create(owner, { kind: "editor", title: "Complete project", content: project });
    assert.deepEqual(doc.content, project);
    assert.equal(doc.audience, "invited");
    await t.test("invited-only denies strangers and reveals no document details", async () => {
      await assert.rejects(store.get(reader, doc.id), (e: any) => e.status === 403 && e.canRequest);
      assert.equal((await store.list(reader)).documents.length, 0);
      await assert.rejects(store.get(reader, randomUUID()), (e: any) => e.status === 404);
    });
    await t.test("request, approve and save only after owner approval", async () => {
      await store.request(reader, doc.id, { message: "Please let me adjust the lesson." });
      assert.equal((await store.list(owner)).documents[0].pendingRequests, 1);
      await assert.rejects(store.decide(other, doc.id, reader.id, { decision: "approve" }), (e: any) => e.status === 403);
      await assert.rejects(store.save(reader, doc.id, { title: doc.title, content: project }, doc.revision), (e: any) => e.status === 403);
      await store.decide(owner, doc.id, reader.id, { decision: "approve" });
      assert.equal((await store.get(reader, doc.id)).role, "editor");
      const next = await store.save(reader, doc.id, { title: "Edited project", content: { ...project, seed: 99 } }, doc.revision);
      assert.notEqual(next.revision, doc.revision);
      assert.equal(next.content.seed, 99);
      assert.equal((await store.get(owner, doc.id, doc.revision)).content.seed, project.seed);
      await assert.rejects(store.save(owner, doc.id, { title: doc.title, content: project }, doc.revision), (e: any) => e.status === 409);
      const current = await store.get(owner, doc.id);
      const member = current.members.find((m: any) => m.email === reader.email);
      await store.removeMember(owner, doc.id, member.id);
      await assert.rejects(store.get(reader, doc.id), (e: any) => e.status === 403);
    });
    await t.test("link access is read-only; owner settings and expiry cannot be bypassed", async () => {
      await store.configure(owner, doc.id, { audience: "link", allowDownload: false });
      assert.equal((await store.get(other, doc.id)).role, "viewer");
      await assert.rejects(store.save(other, doc.id, { title: "Stolen", content: project }, (await store.get(other, doc.id)).revision), (e: any) => e.status === 403);
      await assert.rejects(store.fork(other, doc.id), (e: any) => e.status === 403);
      await assert.rejects(store.configure(other, doc.id, { allowDownload: true }), (e: any) => e.status === 403);
      await store.configure(owner, doc.id, { enabled: false });
      await assert.rejects(store.get(other, doc.id, doc.revision), (e: any) => e.status === 410);
      assert.equal((await store.get(owner, doc.id)).role, "owner");
      await store.configure(owner, doc.id, { enabled: true });
      await pool.query("UPDATE shared_documents SET expires_at=now()-interval '1 second' WHERE id=$1", [doc.id]);
      await assert.rejects(store.get(other, doc.id), (e: any) => e.status === 410);
      await store.configure(owner, doc.id, { expiresAt: null });
    });
    await t.test("all document formats persist; private structured notes excluded by default", async () => {
      const lesson = newLesson(); lesson.pages[0].notes = "PRIVATE NOTES";
      const tv = await store.create(owner, { kind: "tv", title: lesson.title, content: lesson });
      assert.equal(tv.content.pages[0].notes, "");
      for (const kind of ["image","text","presentation","worksheet","activity","storyboard","mindmap","studio","file"]) {
        const content = kind === "file" ? { name: "lesson.pdf", data: "data:application/pdf;base64,QUJD" }
          : kind === "image" ? { type: kind, body: "data:image/png;base64,QUJD" }
          : { type: kind, body: JSON.stringify({ title: kind, text: "Complete content", answerKey: "PRIVATE", notes: "PRIVATE" }) };
        const shared = await store.create(owner, { kind, title: kind, content });
        if (typeof shared.content.body === "string") assert.equal(shared.content.body.includes("PRIVATE"), false);
      }
      const persisted = new DocumentSharingStore(pool);
      assert.equal((await persisted.get(owner, tv.id)).kind, "tv");
    });
    const app = express();
    app.use((req: any, _res, next) => { const id = req.get("x-test-user"); req.session = id ? { userId: id } : {}; next(); });
    registerDocumentSharing(app, pool, async id => [owner,reader,other].find(v => v.id === id) || (id === "unverified" ? { id, email: "unverified@example.invalid", emailVerified: false } : null));
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server!.once("listening", resolve));
    const address = server.address() as any;
    const request = (user: string, path = "", method = "GET", body?: any, headers: Record<string,string> = {}) => fetch(`http://127.0.0.1:${address.port}/api/sharing/documents${path}`, {
      method, headers: { "x-test-user": user, "Content-Type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body),
    });
    await t.test("HTTP endpoints enforce auth, verified email, CSRF and download permission", async () => {
      assert.equal((await request("")).status, 401);
      assert.equal((await request("unverified")).status, 403);
      assert.equal((await request("owner", "", "POST", {}, { Origin: "https://scammer.invalid" })).status, 403);
      assert.equal((await request("owner", "", "POST", {}, { "Sec-Fetch-Site": "cross-site" })).status, 403);
      assert.equal((await request("other", `/${doc.id}/export`)).status, 403);
      assert.equal((await request("owner", `/${doc.id}/export`)).status, 200);
      const forbidden = await request("other", `/${doc.id}/members`, "POST", { email: reader.email, role: "editor" });
      assert.equal(forbidden.status, 403);
      assert.equal((await request("other", `/${doc.id}`, "DELETE")).status, 403);
      assert.equal((await request("owner", "/not-a-uuid")).status, 404);
    });
    await t.test("copies allowed explicitly and deletion removes old revision links", async () => {
      await store.configure(owner, doc.id, { allowDownload: true });
      const copy = await store.fork(other, doc.id);
      assert.equal(copy.role, "owner"); assert.notEqual(copy.id, doc.id);
      await store.remove(owner, doc.id);
      await assert.rejects(store.get(other, doc.id, doc.revision), (e: any) => e.status === 404);
      assert.equal((await store.get(other, copy.id)).role, "owner");
    });
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
    await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end();
  }
});
