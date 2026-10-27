const { readFileSync, writeFileSync } = require("node:fs");
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

function digest(data) {
  return createHash("sha256").update(data).digest("hex");
}

function createManifest(root, revision) {
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error("Expected a full Git revision");
  const files = ["dist/index.cjs", "dist/public/index.html", "dist/public/tv/index.html"];
  for (const htmlFile of files.slice(1)) {
    const html = readFileSync(path.join(root, htmlFile), "utf8");
    const isTV = htmlFile.includes("/tv/");
    const assets = [...html.matchAll(/(?:src|href)="((?:\.\/|\/(?:tv\/)?)(?:assets|tv-assets)\/[^"]+)"/g)];
    if (!assets.length) throw new Error(`No entry assets in ${htmlFile}`);
    for (const [, url] of assets) {
      const file = url.startsWith("./")
        ? `${isTV ? "dist/public/tv" : "dist/public"}/${url.slice(2)}`
        : `dist/public${url}`;
      if (file.includes("..")) throw new Error("Invalid asset path");
      files.push(file);
    }
  }
  const hashes = Object.fromEntries([...new Set(files)].map(file => [
    file, digest(readFileSync(path.join(root, file))),
  ]));
  const guideBundle = files.filter(f => f.startsWith("dist/public/assets/") && f.endsWith(".js"))
    .map(f => readFileSync(path.join(root, f), "utf8")).join("\n");
  if (!guideBundle.includes('"/brightboardtv"') || !guideBundle.includes("BrightboardTV")) {
    throw new Error("Committed client bundle does not contain the BrightboardTV guide route");
  }
  return { schema: 1, revision, files: hashes };
}

module.exports = { createManifest, digest };
if (require.main === module) {
  const revision = process.argv[2] || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  writeFileSync(".release.json", JSON.stringify(createManifest(process.cwd(), revision)) + "\n");
  console.log(`Release manifest prepared for ${revision}`);
}
