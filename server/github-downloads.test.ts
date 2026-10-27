import test from "node:test";
import assert from "node:assert/strict";
import { createGitHubDownloadReader } from "./github-downloads";
import { canSaveTVLibrary } from "./tv-library-access";

test("GitHub release assets are summed and successful requests cached", async () => {
  let calls = 0;
  const reader = createGitHubDownloadReader((async () => {
    calls++;
    return new Response(JSON.stringify([{ tag_name: "v1", assets: [
      { name: "BrightboardTV-source-v1.0.0.zip", download_count: 3 }, { name: "BrightboardTV-prebuilt-v1.0.0.zip", download_count: 7 },
    ] }]));
  }) as typeof fetch);
  const [first, second] = await Promise.all([reader(), reader()]);
  assert.equal(first.available, true); assert.equal(first.total, 10);
  assert.equal(second.total, 10); assert.equal(calls, 1);
  await reader(); assert.equal(calls, 1);
});
test("an empty GitHub release list means zero, not fabricated historical downloads", async () => {
  const reader = createGitHubDownloadReader((async () => new Response("[]")) as typeof fetch);
  assert.equal((await reader()).total, 0);
});
test("GitHub failures are cached as unavailable, never silently changed to zero", async () => {
  let calls = 0;
  const reader = createGitHubDownloadReader((async () => { calls++; return new Response("{}", { status: 403 }); }) as typeof fetch);
  assert.equal((await reader()).available, false);
  assert.equal((await reader()).total, null);
  assert.equal(calls, 1);
});
test("GitHub pagination counts every available release asset", async () => {
  let calls = 0;
  const reader = createGitHubDownloadReader((async () => {
    calls++;
    return new Response(JSON.stringify(calls === 1
      ? Array.from({ length: 100 }, () => ({ assets: [] }))
      : [{ tag_name: "last", assets: [{ name: "BrightboardTV-source.zip", download_count: 11 }] }]));
  }) as typeof fetch);
  assert.equal((await reader()).total, 11); assert.equal(calls, 2);
});
test("only published stable software ZIPs count, not notes, checksums or archives", async () => {
  const reader = createGitHubDownloadReader((async () => new Response(JSON.stringify([
    { tag_name: "v1.0.0", assets: [
      { name: "BrightboardTV-source-v1.0.0.zip", download_count: 4 },
      { name: "BrightboardTV-prebuilt.zip", download_count: 6 },
      { name: "SHA256SUMS.txt", download_count: 100 },
      { name: "RELEASE-NOTES.md", download_count: 80 },
      { name: "Source code.zip", download_count: 50 },
    ] },
    { draft: true, assets: [{ name: "BrightboardTV-source.zip", download_count: 20 }] },
    { prerelease: true, assets: [{ name: "BrightboardTV-source.zip", download_count: 30 }] },
  ]))) as typeof fetch);
  const result = await reader();
  assert.equal(result.total, 10);
  assert.equal(result.assets.length, 2);
});
test("invalid software counts fail explicitly rather than inflate the counter", async () => {
  const reader = createGitHubDownloadReader((async () => new Response(JSON.stringify([
    { tag_name: "v1.0.0", assets: [{ name: "BrightboardTV-source.zip", download_count: -1 }] },
  ]))) as typeof fetch);
  assert.equal((await reader()).available, false);
  assert.equal((await reader()).total, null);
});
test("hosted library permits only active paid accounts or the founder", () => {
  assert.equal(canSaveTVLibrary(null), false);
  assert.equal(canSaveTVLibrary({ subscriptionTier: "free", subscriptionStatus: "active" }), false);
  assert.equal(canSaveTVLibrary({ subscriptionTier: "monthly", subscriptionStatus: "inactive" }), false);
  assert.equal(canSaveTVLibrary({ subscriptionTier: "monthly", subscriptionStatus: "active", subscriptionEndsAt: new Date(Date.now() + 60_000) }), true);
  assert.equal(canSaveTVLibrary({ subscriptionTier: "monthly", subscriptionStatus: "active", subscriptionEndsAt: new Date(Date.now() - 60_000) }), false);
  assert.equal(canSaveTVLibrary({ isOwner: true }), true);
});
