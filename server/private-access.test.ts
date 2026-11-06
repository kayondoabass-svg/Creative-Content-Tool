import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { readFile } from "node:fs/promises";
import { JobQueue } from "./jobQueue";
import { registerPrivateAccessRoutes } from "./private-access";
import { registerFlashcardCatalog } from "./flashcard-catalog";
import { publicFlashcard } from "../shared/flashcard-catalog";

test("retired recovery cannot change founder accounts; generation jobs belong to their creator", async () => {
  const app = express(), jobs = new JobQueue();
  // Test-only identity injection; never used by the actual app.
  app.use(express.json(), (req: any, _res, next) => {
    req.session = { userId: req.get("X-Test-User") }; next();
  });
  registerPrivateAccessRoutes(app, jobs);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const id = jobs.createJob("owner");
    jobs.updateJob(id, { status: "complete", result: { privateDocument: "OWNER ONLY" } });
    assert.throws(() => jobs.createJob(""), /owner/);
    for (const route of ["emergency-reset", "emergency-delete"]) {
      for (const user of ["", "stranger", "owner"]) {
        const response = await fetch(`${base}/api/auth/${route}`, {
          method: "POST", headers: { "Content-Type": "application/json", "X-Test-User": user },
          body: JSON.stringify({ adminKey: "any-key", email: "founder@example.invalid", newPassword: "not-used" }),
        });
        assert.equal(response.status, 410);
      }
    }
    assert.equal((await fetch(`${base}/api/generate/job/${id}`)).status, 401);
    const stranger = await fetch(`${base}/api/generate/job/${id}`, { headers: { "X-Test-User": "stranger" } });
    assert.equal(stranger.status, 404);
    assert.ok(!(await stranger.text()).includes("OWNER ONLY"));
    const owner = await fetch(`${base}/api/generate/job/${id}`, { headers: { "X-Test-User": "owner" } });
    assert.equal(owner.status, 200);
    assert.equal((await owner.json()).result.privateDocument, "OWNER ONLY");
    assert.match(owner.headers.get("cache-control")!, /no-store/);
    assert.equal((await fetch(`${base}/api/generate/job/missing`, { headers: { "X-Test-User": "owner" } })).status, 404);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test("public flashcards are restricted to the built-in catalog, not arbitrary files or customer assets", async () => {
  assert.equal(publicFlashcard("animals", "cat"), true);
  for (const [set, word] of [["../..", ".env"], ["animals", "../private"], ["__proto__", "x"], ["customer-uploads", "cat"]]) {
    assert.equal(publicFlashcard(set, word), false);
  }
  const app = express();
  registerFlashcardCatalog(app);
  app.use((_req, res) => res.status(200).send("UNSAFE FALLTHROUGH"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const image = await fetch(`${base}/flashcard-images/animals/cat.png`);
    assert.equal(image.status, 200);
    assert.match(image.headers.get("content-type")!, /image\/png/);
    for (const path of ["customer-uploads/cat.png", "animals/private.png", ".env", "animals/%2e%2e%2fsecret.png"]) {
      assert.equal((await fetch(`${base}/flashcard-images/${path}`)).status, 404);
    }
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test("main app logging never intercepts or serializes private API response bodies", async () => {
  const source = await readFile("server/index.ts", "utf8");
  assert.ok(!source.includes("capturedJsonResponse"));
  assert.ok(!source.includes("res.json ="));
  const routes = await readFile("server/routes.ts", "utf8");
  assert.ok(!routes.includes("ADMIN_RESET_KEY"));
  assert.ok(routes.includes('app.get("/api/list-models", isOwnerMiddleware'));
  assert.ok(routes.includes("jobQueue.createJob(userId)"));
});
