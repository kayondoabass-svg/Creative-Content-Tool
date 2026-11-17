import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { JobQueue } from "./jobQueue";
import { acceptGenerationResult } from "../client/src/lib/generation-result";
import { deviceResponse } from "../client/src/lib/device-response";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const record = (userId: string, id = 1) => ({ id, userId, type: "presentation", title: "Lesson", content: '{"title":"Lesson","slides":[]}' });

test("jobs require owned saved results; old cache response shape cannot succeed", async () => {
  const q = new JobQueue(1);
  for (const result of [{ content: "old cache", id: 1 }, { data: record("other") }, { data: record("owner") }]) {
    const id = q.createJob("owner");
    await q.enqueue(id, async () => result); await wait(10);
    assert.equal(q.getOwnedJob(id, "other"), undefined);
    assert.equal(q.getOwnedJob(id, "owner")?.status, result.data?.userId === "owner" ? "complete" : "error");
  }
});

test("late completion never replaces a timeout and the next queued job still runs", async () => {
  const q = new JobQueue(1, 10);
  const first = q.createJob("a"), second = q.createJob("b");
  await q.enqueue(first, async () => { await wait(35); return { data: record("a") }; });
  await q.enqueue(second, async () => ({ data: record("b", 2) }));
  await wait(60);
  assert.equal(q.getOwnedJob(first, "a")?.status, "error");
  assert.equal(q.getOwnedJob(first, "a")?.result, undefined);
  assert.equal(q.getOwnedJob(second, "b")?.status, "complete");
});

test("frontend rejects missing results, wrong owners and mismatched tools", () => {
  assert.throws(() => acceptGenerationResult(null, "a", "presentation"));
  assert.throws(() => acceptGenerationResult(record("a"), "b", "presentation"));
  assert.throws(() => acceptGenerationResult(record("a"), "a", "image"));
  assert.doesNotThrow(() => acceptGenerationResult(record("a"), "a", "presentation"));
});

test("HTML and malformed device responses become actionable messages, not parser crashes", async () => {
  await assert.rejects(deviceResponse(new Response("<html>Bad gateway</html>", { status: 502 }), "list"), /unavailable/);
  await assert.rejects(deviceResponse(new Response("<html>Unexpected</html>"), "list"), /invalid response/);
  await assert.rejects(deviceResponse(Response.json({ sessions: [] }), "list"), /invalid response/);
  await assert.rejects(deviceResponse(Response.json({ error: "private provider detail" }, { status: 401 }), "list"), /session expired/);
  assert.deepEqual(await deviceResponse(Response.json({ supported: false, sessions: [], message: "Unsupported" }), "list"), { supported: false, sessions: [], message: "Unsupported" });
});

test("generation no longer reads or writes the shared output cache", () => {
  const routes = readFileSync("server/routes.ts", "utf8");
  assert.doesNotMatch(routes, /getFromCache\(|setCache\(|const generationCache/);
  assert.match(routes, /gameReferenceMessages\(options\)/);
  assert.match(routes, /generateGamePresentation\(\s*prompt,\s*presentationOptions.gameTemplate,[\s\S]*?effectiveSlideCount,\s*presentationOptions,\s*\)/);
  assert.match(routes, /validateGeneratedContent\(type, title, generatedContent\)/);
});
