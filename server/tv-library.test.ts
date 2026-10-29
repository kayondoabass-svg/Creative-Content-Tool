import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { canSaveTVLibrary } from "./tv-library-access";
import { initializeTVLibrary, TVLibraryStore, TV_LIBRARY_LIMITS } from "./tv-library-store";
import { registerTVLibraryRoutes } from "./tv-library-routes";
import { newLesson, blankPage } from "../packages/brightboard-tv/src/types";
import { lessonFromJSON } from "../packages/brightboard-tv/src/helpers";

test("library entitlement requires a known paid tier, active status and a real future expiry", () => {
  const now = Date.now(), paid = { subscriptionTier: "monthly", subscriptionStatus: "active", subscriptionEndsAt: new Date(now + 60000) };
  assert.equal(canSaveTVLibrary(paid, now), true);
  for (const user of [null, {}, { ...paid, subscriptionTier: "free" }, { ...paid, subscriptionTier: "trial" },
    { ...paid, subscriptionStatus: "cancelled" }, { ...paid, subscriptionStatus: "inactive" },
    { ...paid, subscriptionEndsAt: null }, { ...paid, subscriptionEndsAt: "invalid" },
    { ...paid, subscriptionEndsAt: new Date(now) }, { ...paid, subscriptionEndsAt: new Date(now - 1) }]) {
    assert.equal(canSaveTVLibrary(user, now), false);
  }
  assert.equal(canSaveTVLibrary({ isOwner: true }, now), true);
});

test("private durable account libraries: ownership, uploads, expiry, quotas and recovery", { skip: !process.env.DATABASE_URL }, async t => {
  // Disposable schema in the existing development database, never real users.
  const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const schema = `tv_library_test_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}` });
  let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;
  try {
    await pool.query("CREATE TABLE users(id varchar PRIMARY KEY)");
    await pool.query("INSERT INTO users VALUES('alice'),('bob'),('free'),('expired')");
    await initializeTVLibrary(pool);
    await initializeTVLibrary(pool); // idempotent restarts
    const store = new TVLibraryStore(pool);
    const users: Record<string, any> = Object.fromEntries(["alice", "bob", "free", "expired"].map(id => [id, {
      id, subscriptionTier: "monthly", subscriptionStatus: "active", subscriptionEndsAt: new Date(Date.now() + 3600000),
    }]));
    users.free.subscriptionTier = "free";
    users.expired.subscriptionEndsAt = new Date(Date.now() - 1000);
    const app = express();
    app.use((req: any, _res, next) => { req.session = { userId: req.headers["x-test-user"] }; next(); });
    let expireDuringLookup = false, lookupCount = 0;
    registerTVLibraryRoutes(app, store, async id => {
      if (expireDuringLookup && id === "alice" && ++lookupCount === 2) return { ...users.alice, subscriptionEndsAt: new Date(0) };
      return users[id] || null;
    });
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server!.once("listening", resolve));
    const base = `http://127.0.0.1:${(server.address() as any).port}/api/tv/library`;
    const request = (user: string, path = "", method = "GET", body?: unknown, revision?: string, headers = {}) => fetch(base + path, {
      method, headers: { ...(user ? { "x-test-user": user } : {}), "Content-Type": "application/json", ...(revision ? { "If-Match": revision } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const lesson = newLesson(); lesson.title = "Alice private classroom";
    lesson.pages[0].notes = "Private presenter notes";
    lesson.pages[0].objects.push({ id: "image", type: "image", src: "data:image/png;base64,iVBORw0KGgo=",
      x: 0, y: 0, width: 1, height: 1, color: "#183a40" });
    let revision: string;
    await t.test("anonymous, free and expired callers cannot write; paid flag in body cannot bypass checks", async () => {
      assert.equal((await request("", "", "GET")).status, 401);
      for (const id of ["", "free", "expired"]) {
        for (const method of ["PUT", "PATCH", "DELETE"]) {
          assert.equal((await request(id, `/${lesson.id}`, method, { ...lesson, isPaid: true, canSaveLibrary: true })).status, id ? 403 : 401);
        }
      }
      assert.equal((await request("alice", `/${lesson.id}`, "PUT", lesson, undefined, { Origin: "https://other.example" })).status, 403);
      assert.equal((await request("alice", `/${lesson.id}`, "PUT", lesson, undefined, { "Sec-Fetch-Site": "cross-site" })).status, 403);
    });
    await t.test("paid upload persists private embedded assets and new store instances can read it", async () => {
      const saved = await request("alice", `/${lesson.id}`, "PUT", lesson);
      assert.equal(saved.status, 200);
      revision = (await saved.json()).revision;
      const reopened = await new TVLibraryStore(pool).get("alice", lesson.id);
      assert.deepEqual(reopened.lesson.pages, lesson.pages);
      assert.equal(reopened.lesson.title, lesson.title);
      const response = await request("alice", `/${lesson.id}`);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.deepEqual((await response.json()).lesson.pages, lesson.pages);
      const listed = await (await request("alice")).json();
      assert.equal(listed.lessons.length, 1);
      assert.equal(listed.lessons[0].document, undefined);
      assert.equal(listed.lessons[0].pages, undefined);
      assert.equal(listed.usage.bytes, Buffer.byteLength(JSON.stringify(lesson)));
    });
    await t.test("second user cannot list, read, rename or delete another account's lesson, even knowing its revision", async () => {
      assert.equal((await (await request("bob")).json()).lessons.length, 0);
      for (const method of ["GET", "PATCH", "DELETE"]) {
        assert.equal((await request("bob", `/${lesson.id}`, method, method === "PATCH" ? { title: "Stolen" } : undefined, revision)).status, 404);
      }
      const bobLesson = { ...lesson, title: "Bob independent copy", pages: [blankPage("Bob")] };
      assert.equal((await request("bob", `/${lesson.id}`, "PUT", bobLesson)).status, 200);
      assert.equal((await store.get("alice", lesson.id)).lesson.title, lesson.title);
      assert.equal((await store.get("bob", lesson.id)).lesson.title, bobLesson.title);
    });
    await t.test("stale writes fail without changing data; rename changes exports and deletion affects only one owner", async () => {
      assert.equal((await request("alice", `/${lesson.id}`, "PUT", lesson)).status, 409);
      const renamed = await request("alice", `/${lesson.id}`, "PATCH", { title: "Renamed Alice lesson" }, revision);
      assert.equal(renamed.status, 200);
      const next = (await renamed.json()).revision;
      assert.notEqual(next, revision);
      assert.equal((await request("alice", `/${lesson.id}`, "DELETE", undefined, revision)).status, 409);
      assert.equal((await store.get("alice", lesson.id)).lesson.title, "Renamed Alice lesson");
      revision = next;
    });
    await t.test("expiry is checked on every write; saved lessons remain readable/exportable without expiring", async () => {
      users.alice.subscriptionEndsAt = new Date(Date.now() - 1000);
      for (const method of ["PUT", "PATCH", "DELETE"]) assert.equal((await request("alice", `/${lesson.id}`, method,
        method === "DELETE" ? undefined : lesson, revision)).status, 403);
      assert.equal((await request("alice")).status, 200);
      const result = await (await request("alice", `/${lesson.id}`)).json();
      const exported = lessonFromJSON(JSON.stringify(result.lesson));
      assert.deepEqual(exported.pages, lesson.pages);
      await pool.query("UPDATE tv_libraries SET updated_at=now()-interval '30 days' WHERE user_id='alice'");
      assert.equal((await store.list("alice")).lessons.length, 1);
      assert.equal((await store.get("alice", lesson.id)).lesson.pages[0].notes, "Private presenter notes");
      users.alice.subscriptionEndsAt = new Date(Date.now() + 60000);
    });
    await t.test("invalid uploads, remote assets, mismatched IDs and page overflow are rejected without modifying saved data", async () => {
      for (const invalid of [{}, { ...lesson, id: "different" }, { ...lesson, pages: [null] },
        { ...lesson, pages: Array.from({ length: 51 }, () => blankPage()) },
        { ...lesson, pages: [{ ...lesson.pages[0], objects: [{ ...lesson.pages[0].objects[0], src: "https://external.example/private.png" }] }] }]) {
        assert.equal((await request("alice", `/${lesson.id}`, "PUT", invalid, revision)).status, 400);
      }
      const malformed = await fetch(`${base}/${lesson.id}`, { method: "PUT", headers: { "x-test-user": "alice", "Content-Type": "application/json" }, body: "{" });
      assert.equal(malformed.status, 400);
      assert.equal((await request("alice", `/${lesson.id}`, "PUT", lesson, revision, { "Content-Type": "text/plain" })).status, 415);
      assert.equal((await store.get("alice", lesson.id)).lesson.title, "Renamed Alice lesson");
    });
    await t.test("paid access is checked again when an upload finishes, not only before parsing it", async () => {
      expireDuringLookup = true; lookupCount = 0;
      assert.equal((await request("alice", `/${lesson.id}`, "PUT", lesson, revision)).status, 403);
      expireDuringLookup = false;
      assert.equal((await store.get("alice", lesson.id)).lesson.title, "Renamed Alice lesson");
    });
    await t.test("uploads above the old browser-storage size round-trip and exports are self-contained", async () => {
      const large = newLesson();
      large.pages[0].objects.push({ id: "large", type: "text", text: "a".repeat(6 * 1024 * 1024), x: 0, y: 0, width: 1, height: 1, color: "#183a40" });
      const saved = await request("alice", `/${large.id}`, "PUT", large);
      assert.equal(saved.status, 200);
      const recovered = lessonFromJSON(JSON.stringify((await store.get("alice", large.id)).lesson));
      assert.deepEqual(recovered.pages, large.pages);
      assert.equal((await store.list("alice")).lessons.length, 2);
      await store.delete("alice", large.id, (await saved.json()).revision);
    });
    await t.test("count and byte quotas are enforced atomically across competing writes; replacement reclaims old bytes", async () => {
      await pool.query("DELETE FROM tv_libraries WHERE user_id='bob'");
      const limited = new TVLibraryStore(pool, { ...TV_LIBRARY_LIMITS, maxLessons: 1 });
      const results = await Promise.allSettled([limited.save("bob", "one", { ...newLesson(), id: "one" }), limited.save("bob", "two", { ...newLesson(), id: "two" })]);
      assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
      assert.equal(results.filter(result => result.status === "rejected").length, 1);
      const [old] = (await limited.list("bob")).lessons;
      await limited.save("bob", old.id, { ...newLesson(), id: old.id }, old.revision);
      await pool.query("DELETE FROM tv_libraries WHERE user_id='bob'");
      const raw = { ...newLesson(), id: "bytes" };
      const bytes = Buffer.byteLength(JSON.stringify(raw));
      const byteLimited = new TVLibraryStore(pool, { ...TV_LIBRARY_LIMITS, maxBytes: bytes });
      const saved = await byteLimited.save("bob", raw.id, raw);
      await assert.rejects(byteLimited.save("bob", "more", { ...raw, id: "more" }), /library is full/);
      await assert.rejects(byteLimited.rename("bob", raw.id, "x".repeat(200), saved.revision), /storage limit/);
      const fileLimited = new TVLibraryStore(pool, { ...TV_LIBRARY_LIMITS, maxLessonBytes: bytes - 1 });
      await assert.rejects(fileLimited.save("bob", raw.id, raw, saved.revision), /larger than 64 MB/);
      assert.equal((await byteLimited.list("bob")).usage.bytes, bytes);
    });
    await t.test("paid delete removes only account copy; downloaded backup still opens independently", async () => {
      const before = await store.get("alice", lesson.id);
      const backup = JSON.stringify(before.lesson);
      assert.equal((await request("alice", `/${lesson.id}`, "DELETE", undefined, before.revision)).status, 204);
      assert.equal((await request("alice", `/${lesson.id}`)).status, 404);
      assert.deepEqual(lessonFromJSON(backup).pages, lesson.pages);
      assert.equal((await store.list("bob")).lessons.length, 1);
    });
  } finally {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
