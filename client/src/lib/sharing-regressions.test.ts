import test from "node:test";
import assert from "node:assert/strict";
import { prepareShareSnapshot, sharingRequest, stableShareUrl } from "./sharing";

test("revision links stay distinct while latest links remain stable", () => {
  const previous = globalThis.window;
  (globalThis as any).window = { location: { origin: "https://www.brightboardapp.com" } };
  try {
    assert.equal(stableShareUrl("document"), "https://www.brightboardapp.com/share/document");
    assert.notEqual(stableShareUrl("document", "first"), stableShareUrl("document", "second"));
  } finally { (globalThis as any).window = previous; }
});
test("oversized image snapshots fail explicitly before publication", async () => {
  await assert.rejects(prepareShareSnapshot({ body: `data:image/png;base64,${"A".repeat(17 * 1024 * 1024)}` }, "image"), /16 MB/);
});
test("image preparation uses a bounded network request and preserves failure", async () => {
  const previousFetch = globalThis.fetch, previousWindow = globalThis.window;
  (globalThis as any).window = { location: { origin: "https://www.brightboardapp.com" } };
  globalThis.fetch = async (_url, init) => {
    assert.ok(init?.signal instanceof AbortSignal);
    throw new Error("image host unavailable");
  };
  try {
    await assert.rejects(prepareShareSnapshot({ body: "https://images.example.invalid/image.png" }, "image"), /Nothing was shared/);
  } finally { globalThis.fetch = previousFetch; (globalThis as any).window = previousWindow; }
});
test("sharing requests have a timeout and actionable offline errors", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (_url, init) => { assert.ok(init?.signal instanceof AbortSignal); throw new Error("offline"); };
  try { await assert.rejects(sharingRequest("/api/sharing/documents"), /check existing shares/i); }
  finally { globalThis.fetch = previous; }
});
