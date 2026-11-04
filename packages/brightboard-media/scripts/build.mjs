import { build } from "esbuild";
import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export async function buildMedia() {
  const dist = path.join(root, "dist");
  await rm(dist, { recursive: true, force: true }); await mkdir(dist, { recursive: true });
  await build({ entryPoints: [path.join(root, "src/main.tsx")], bundle: true, format: "iife", target: "es2020", outfile: path.join(dist, "app.js"), minify: true, legalComments: "eof", define: { "process.env.NODE_ENV": '"production"' }, jsx: "automatic" });
  await build({ entryPoints: [path.join(root, "src/sdk.ts")], bundle: true, format: "iife", globalName: "BrightBoardMedia", target: "es2020", outfile: path.join(dist, "media-sdk.js"), minify: true, legalComments: "eof" });
  const css = await readFile(path.join(dist, "app.css"), "utf8");
  const js = await readFile(path.join(dist, "app.js"), "utf8");
  // No import maps, CDN dependencies, ESM fetches or runtime build tools.
  const safeJS = js.replaceAll("</script", "<\\/script");
  await writeFile(path.join(dist, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>BrightBoard Media Studio — Offline</title><style>body{margin:0}${css}</style></head><body><div id="root"></div><script>${safeJS}</script></body></html>`);
  for (const name of ["brand-logo.png", "LICENSE", "THIRD-PARTY-NOTICES.txt", "README.md"]) await cp(path.join(root, name), path.join(dist, name));
  console.log("Built independent BrightBoard Media Studio: offline HTML and local SDK.");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildMedia();
