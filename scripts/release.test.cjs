const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { createManifest, digest } = require("./release-manifest.cjs");
const { verify, ProtectedCheck } = require("./verify-release.cjs");
const { readFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "release-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bodies = {
    "dist/index.cjs": "server bundle",
    "dist/public/index.html": '<div id="root"></div><script src="/assets/app.js"></script><link href="/assets/app.css">',
    "dist/public/assets/app.js": 'const route="/brightboardtv"; const title="BrightboardTV";',
    "dist/public/assets/app.css": "body{}",
    "dist/public/tv/index.html": '<script src="./assets/tv.js"></script>',
    "dist/public/tv/assets/tv.js": "TV app",
  };
  for (const [file, body] of Object.entries(bodies)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), body);
  }
  const manifest = createManifest(root, "a".repeat(40));
  const responses = {
    "/api/release": [JSON.stringify({ schema: 1, revision: manifest.revision, serverSha256: digest(bodies["dist/index.cjs"]) }), "application/json"],
    "/api/tv/health": [JSON.stringify({ ok: true, transport: "https-long-poll", offlinePairing: false, hostedLibrary: true }), "application/json"],
    "/sitemap.xml": ['<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://www.brightboardapp.com/brightboardtv</loc></url></urlset>', "application/xml"],
    "/brightboardtv": [bodies["dist/public/index.html"].replace('<div', '<title>SEO injected</title><div'), "text/html"],
  };
  for (const [file, body] of Object.entries(bodies)) {
    if (!file.startsWith("dist/public/")) continue;
    const url = file === "dist/public/tv/index.html" ? "/tv/" : file.slice("dist/public".length);
    responses[url] = [body, file.endsWith(".html") ? "text/html" : file.endsWith(".css") ? "text/css" : "application/javascript"];
  }
  const fetcher = async url => {
    const [body, type, status = 200, headers = {}] = responses[url.pathname] || ["not found", "text/plain", 404];
    assert.ok(url.searchParams.has("release_check"));
    return new Response(body, { status, headers: { "content-type": type, ...headers } });
  };
  return { root, manifest, responses, fetcher };
}

test("verifies exact process, both clients, relay and sitemap without SPA false positives", async t => {
  const f = fixture(t);
  assert.ok(f.manifest.files["dist/public/tv/assets/tv.js"]);
  await verify("https://example.test", f.manifest, f.fetcher);
});

for (const [name, url, body, type] of [
  ["old revision", "/api/release", JSON.stringify({ schema: 1, revision: "b".repeat(40), serverSha256: digest("server bundle") }), "application/json"],
  ["wrong running server", "/api/release", JSON.stringify({ schema: 1, revision: "a".repeat(40), serverSha256: "wrong" }), "application/json"],
  ["SPA fallback on API", "/api/tv/health", "<html>app</html>", "text/html"],
  ["wrong relay", "/api/tv/health", '{"ok":true}', "application/json"],
  ["old client asset", "/assets/app.js", "old app", "application/javascript"],
  ["old TV asset", "/tv/assets/tv.js", "old TV app", "application/javascript"],
  ["missing guide", "/brightboardtv", "<html>fallback</html>", "text/html"],
  ["missing sitemap entry", "/sitemap.xml", "<urlset></urlset>", "application/xml"],
  ["SPA sitemap fallback", "/sitemap.xml", "<html>app</html>", "text/html"],
]) {
  test(`rejects ${name}`, async t => {
    const f = fixture(t);
    f.responses[url] = [body, type];
    await assert.rejects(verify("https://example.test", f.manifest, f.fetcher));
  });
}
for (const status of [401, 403, 429]) {
  test(`reports protected HTTP ${status} distinctly`, async t => {
    const f = fixture(t);
    f.responses["/api/release"] = ["protected", "text/html", status];
    await assert.rejects(verify("https://example.test", f.manifest, f.fetcher), ProtectedCheck);
  });
}
test("detects Cloudflare challenge even with HTTP 200", async t => {
  const f = fixture(t);
  f.responses["/api/release"] = ["challenge", "text/html", 200, { "cf-mitigated": "challenge" }];
  await assert.rejects(verify("https://example.test", f.manifest, f.fetcher), ProtectedCheck);
});
test("rejects redirects instead of following a login page", async t => {
  const f = fixture(t);
  f.responses["/api/release"] = ["", "text/html", 302, { location: "/login" }];
  await assert.rejects(verify("https://example.test", f.manifest, f.fetcher), /HTTP 302/);
});
test("committed artifacts must contain guide route and complete assets", t => {
  const f = fixture(t);
  writeFileSync(path.join(f.root, "dist/public/assets/app.js"), "old bundle");
  assert.throws(() => createManifest(f.root, "a".repeat(40)), /guide route/);
  assert.throws(() => createManifest(f.root, "not-a-revision"), /full Git revision/);
  rmSync(path.join(f.root, "dist/public/tv/assets/tv.js"));
  assert.throws(() => createManifest(f.root, "a".repeat(40)), /ENOENT/);
});

test("workflow blocks missing SSH secrets without printing credential values", t => {
  const f = fixture(t);
  const workflow = readFileSync(path.join(__dirname, "../.github/workflows/deploy.yml"), "utf8");
  const step = workflow.split("- name: Check deployment credentials")[1].split("- name: Deploy exact")[0];
  const script = step.split("run: |\n")[1].split("\n").map(line => line.slice(10)).join("\n");
  for (const configured of [false, true]) {
    const summary = path.join(f.root, configured ? "ready-summary" : "blocked-summary");
    const value = "dummy-do-not-log";
    const result = spawnSync("bash", ["-c", script], {
      encoding: "utf8", env: {
        PATH: process.env.PATH, GITHUB_STEP_SUMMARY: summary,
        VPS_HOST: value, VPS_USER: value, SSH_PRIVATE_KEY: value,
        VPS_FINGERPRINT: configured ? value : "",
      },
    });
    assert.equal(result.status, configured ? 0 : 1);
    assert.ok(!(result.stdout + result.stderr).includes(value));
    if (!configured) {
      const report = readFileSync(summary, "utf8");
      assert.match(report, /BLOCKED/);
      assert.match(report, /VPS_FINGERPRINT/);
      assert.match(report, /No rollout or live revision has been verified/);
    }
  }
});
