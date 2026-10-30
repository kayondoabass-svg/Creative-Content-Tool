import test from "node:test";
import assert from "node:assert/strict";
import { checkForUpdates, compareVersions, parseBuild, releaseResult, serverResult, type BuildInfo } from "../src/update-check";

const current: BuildInfo = { schema: 1, product: "BrightboardTV", version: "1.0.2", buildId: "a".repeat(20) };
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json" },
});

test("versions compare numerically; malformed/prerelease versions are not accepted", () => {
  assert.equal(compareVersions("1.10.0", "1.9.9"), 1);
  assert.equal(compareVersions("1.0.2", "1.0.2"), 0);
  assert.equal(compareVersions("1.0.1", "1.0.2"), -1);
  assert.throws(() => compareVersions("1.0.2-beta", "1.0.2"));
});
test("server checks distinguish same, changed, and older builds", () => {
  assert.equal(serverResult(current, current).status, "current");
  assert.equal(serverResult({ ...current, buildId: "b".repeat(20) }, current).status, "different");
  assert.equal(serverResult({ ...current, version: "1.0.3" }, current).status, "different");
  assert.equal(serverResult({ ...current, version: "1.0.1" }, current).status, "older");
  assert.throws(() => parseBuild({ ...current, product: "Another app" }));
  assert.throws(() => parseBuild({ ...current, buildId: "../something" }));
});
test("release links use only the fixed public repository, never remote URL fields", () => {
  const result = releaseResult({ draft: false, prerelease: false, tag_name: "v1.0.3", html_url: "javascript:alert(1)" }, current.version);
  assert.equal(result.status, "newer");
  assert.equal(result.url, "https://github.com/kayondoabass-svg/Brightboard-TV/releases/tag/v1.0.3");
  assert.throws(() => releaseResult({ draft: false, prerelease: true, tag_name: "v1.0.3" }, current.version));
  assert.throws(() => releaseResult({ draft: false, prerelease: false, tag_name: "../../evil" }, current.version));
});
test("checks keep hosted and GitHub status independent and bypass caches", async () => {
  const calls: { url: string; options?: RequestInit }[] = [];
  const request: typeof fetch = async (input, options) => {
    calls.push({ url: String(input), options });
    return String(input).startsWith("https://api.github.com/")
      ? response({ draft: false, prerelease: false, tag_name: "v1.0.3" })
      : response(current);
  };
  const result = await checkForUpdates(request, current, "https://example.test/tv/?mode=edit");
  assert.equal(result.server.status, "current");
  assert.equal(result.release.status, "newer");
  assert.equal(calls[0].url, "https://example.test/tv/version.json");
  assert.equal(calls[0].options?.credentials, "same-origin");
  assert.equal(calls[1].options?.credentials, "omit");
  assert.ok(calls.every(c => c.options?.cache === "no-store"));
  assert.match(result.release.message, /do not automatically update/);
});
test("offline, protected and old HTML responses never claim the app is current", async () => {
  for (const mode of ["offline", "html", "403"]) {
    const request: typeof fetch = async () => {
      if (mode === "offline") throw new TypeError("offline");
      return mode === "html" ? new Response("<html>Old app</html>", { headers: { "content-type": "text/html" } }) : response({}, 403);
    };
    const result = await checkForUpdates(request, current, "https://example.test/");
    assert.equal(result.server.status, "unavailable");
    assert.equal(result.release.status, "unavailable");
  }
});
test("GitHub rate limits do not hide a valid server update", async () => {
  const request: typeof fetch = async input => String(input).includes("api.github.com")
    ? response({}, 403) : response({ ...current, buildId: "b".repeat(20) });
  const result = await checkForUpdates(request, current, "https://example.test/");
  assert.equal(result.server.status, "different");
  assert.equal(result.release.status, "unavailable");
});
