const { readFileSync, appendFileSync } = require("node:fs");
const { digest } = require("./release-manifest.cjs");

class ProtectedCheck extends Error {}
async function verify(base, manifest, fetcher = fetch) {
  const root = new URL(base);
  if (!["http:", "https:"].includes(root.protocol) || root.username || root.password) {
    throw new Error("Invalid verification URL");
  }
  async function get(path, type) {
    const url = new URL(path, root);
    url.searchParams.set("release_check", `${manifest.revision}-${Date.now()}`);
    const response = await fetcher(url, {
      redirect: "manual", signal: AbortSignal.timeout(10000),
      headers: { "Cache-Control": "no-cache", Accept: type },
    });
    if (response.headers.get("cf-mitigated") === "challenge" ||
        [401, 403, 429].includes(response.status)) {
      throw new ProtectedCheck(`Access protection prevented checking ${path} (HTTP ${response.status})`);
    }
    if (response.status !== 200) throw new Error(`${path}: HTTP ${response.status}`);
    if (!response.headers.get("content-type")?.includes(type)) throw new Error(`${path}: unexpected content type`);
    return response.text();
  }
  const release = JSON.parse(await get("/api/release", "application/json"));
  if (release.schema !== 1 || release.revision !== manifest.revision ||
      release.serverSha256 !== manifest.files["dist/index.cjs"]) {
    throw new Error("Running process is not the expected revision/build");
  }
  const relay = JSON.parse(await get("/api/tv/health", "application/json"));
  if (relay.ok !== true || relay.transport !== "https-long-poll" ||
      relay.offlinePairing !== false || relay.hostedLibrary !== true) {
    throw new Error("BrightboardTV hosted relay contract is missing");
  }
  for (const [file, expected] of Object.entries(manifest.files)) {
    if (!file.startsWith("dist/public/")) continue;
    const path = file === "dist/public/tv/index.html" ? "/tv/"
      : file.slice("dist/public".length);
    const type = file.endsWith(".html") ? "text/html" : file.endsWith(".css") ? "text/css" : "javascript";
    if (digest(await get(path, type)) !== expected) throw new Error(`${path}: served build differs from release`);
  }
  // The guide is an SPA route with server-injected SEO, so its HTML is not
  // byte-identical to index.html. Require the exact verified entry assets AND
  // the guide route in that verified bundle (checked when making the manifest).
  const guide = await get("/brightboardtv", "text/html");
  const entryAssets = Object.keys(manifest.files).filter(file => file.startsWith("dist/public/assets/"));
  for (const file of entryAssets) {
    if (!guide.includes(`"${file.slice("dist/public".length)}"`)) {
      throw new Error("BrightboardTV guide does not load the expected application");
    }
  }
  if (!guide.includes('id="root"')) throw new Error("BrightboardTV guide application root is missing");
  const sitemap = await get("/sitemap.xml", "xml");
  if (!sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">') ||
      !/<loc>https:\/\/www\.brightboardapp\.com\/brightboardtv<\/loc>/.test(sitemap)) {
    throw new Error("Sitemap is missing the BrightboardTV guide entry");
  }
}

module.exports = { verify, ProtectedCheck };
if (require.main === module) {
  (async () => {
    const manifest = JSON.parse(readFileSync(process.argv[3] || ".release.json", "utf8"));
    let last;
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        await verify(process.argv[2], manifest);
        console.log(`VERIFIED: running revision ${manifest.revision}, guide/assets, TV relay and sitemap`);
        return;
      } catch (error) {
        last = error;
        if (error instanceof ProtectedCheck) break;
        if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    const protectedCheck = last instanceof ProtectedCheck;
    const message = `${protectedCheck ? "BLOCKED" : "FAILED"}: ${last.message}`;
    console.error(message);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${message}\n\n`);
    process.exitCode = protectedCheck ? 2 : 1;
  })();
}
