import test from "node:test";
import assert from "node:assert/strict";
import { prepareShareSnapshot, sharingRequest, stableShareUrl, withShareRequests, type ShareOptions } from "./sharing";

test("edit requests preserve public viewing and all other sharing options", () => {
  const original: ShareOptions = { audience: "link", allowRequests: false, allowDownload: true, includePrivate: false, expiresAt: "2027-01-01T00:00:00Z" };
  const enabled = withShareRequests(original, true);
  assert.deepEqual(enabled, { ...original, allowRequests: true });
  assert.deepEqual(withShareRequests(enabled, false), original);
  assert.equal(original.allowRequests, false);
});

test("access requests never publish an invited-only document", () => {
  const original: ShareOptions = { audience: "invited", allowRequests: false, allowDownload: false, includePrivate: false, expiresAt: null };
  assert.equal(withShareRequests(original, true).audience, "invited");
});

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
