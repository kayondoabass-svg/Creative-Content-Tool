import { build } from "vite";
import { build as bundle } from "esbuild";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await import("./generate-models.mjs");
await build({ configFile: path.join(root, "vite.config.mts") });
const assets = await readdir(path.join(root, "dist/assets"));
// Bundle actual notices for code distributed in the compiled browser release.
const lock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
const notices = [];
for (const [key, entry] of Object.entries(lock.packages)) {
  if (!key || entry.dev) continue;
  for (const base of [root, path.resolve(root, "../..")]) {
    const directory = path.join(base, key);
    let files;
    try { files = await readdir(directory); } catch { continue; }
    for (const file of files.filter(name => /^(licen[sc]e|notice)(\.[a-z]+)?$/i.test(name))) {
      try { notices.push(`\n--- ${key} ${entry.version} / ${file} ---\n${await readFile(path.join(directory, file), "utf8")}`); } catch { /* A directory named LICENSE is not a notice file. */ }
    }
    break;
  }
}
await writeFile(path.join(root, "dist/THIRD_PARTY_LICENSES.txt"), notices.join("\n"));
const release = createHash("sha256").update(assets.join("\n")).digest("hex").slice(0, 12);
const worker = await readFile(path.join(root, "public/sw.js"), "utf8");
await writeFile(path.join(root, "dist/sw.js"),
  worker.replace('"brightboardtv-v1-shell"', JSON.stringify(`brightboardtv-${release}-shell`)));
await writeFile(path.join(root, "dist/precache.json"), JSON.stringify([
  "./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  ...assets.map(a => `./assets/${a}`),
]));
await mkdir(path.join(root, "build"), { recursive: true });
await bundle({ entryPoints: [path.join(root, "server/standalone.ts")], outfile: path.join(root, "build/server.cjs"),
  bundle: true, platform: "node", format: "cjs", packages: "external", sourcemap: false });
console.log("BrightboardTV standalone release built.");
