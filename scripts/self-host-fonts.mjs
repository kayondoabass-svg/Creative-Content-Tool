// Optional maintenance command. The app/build uses the saved files, never this network fetch.
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const main = "client/public/fonts";
const sandbox = "artifacts/mockup-sandbox/public/fonts";
const userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const fontUrls = text => [...new Set(text.match(/https:\/\/fonts\.googleapis\.com\/css2\?[^"'<>)]*/g) || [])];
let requests;
try { requests = JSON.parse(await readFile(`${main}/manifest.json`, "utf8")).requests; }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  const html = await readFile("client/index.html", "utf8");
  const styles = await readFile("client/src/index.css", "utf8");
  const preview = await readFile("artifacts/mockup-sandbox/index.html", "utf8");
  requests = {
    interface: [fontUrls(html)[0], ...fontUrls(styles)],
    editor: [fontUrls(html).find(url => url.includes("Fira+Code"))],
    sandbox: [fontUrls(preview)[0]],
  };
}
if (Object.values(requests).flat().some(url => !url)) throw new Error("Missing original font requests.");
await mkdir(main, { recursive: true });
await mkdir(sandbox, { recursive: true });
const files = new Map();
const families = new Set();
async function download(url) {
  const response = await fetch(url, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Font download failed: HTTP ${response.status} for ${new URL(url).hostname}`);
  return Buffer.from(await response.arrayBuffer());
}
async function batch(items, callback) {
  let index = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (index < items.length) await callback(items[index++]);
  }));
}
const stylesheets = {};
for (const [name, urls] of Object.entries(requests)) {
  const css = (await Promise.all(urls.map(async url => (await download(url)).toString("utf8")))).join("\n");
  for (const match of css.matchAll(/font-family:\s*'([^']+)'/g)) families.add(match[1]);
  const sources = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(match => match[1]))];
  await batch(sources, async url => {
    if (files.has(url)) return;
    const bytes = await download(url);
    if (bytes.subarray(0, 4).toString() !== "wOF2") throw new Error("Expected a WOFF2 font file.");
    const filename = `${createHash("sha256").update(bytes).digest("hex").slice(0, 24)}.woff2`;
    await writeFile(path.join(main, filename), bytes);
    files.set(url, { filename, bytes: bytes.length });
  });
  stylesheets[name] = css.replace(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g, (_, url) => `url('/fonts/${files.get(url).filename}')`);
  if (/https?:\/\//.test(stylesheets[name])) throw new Error("External URL remained in a font stylesheet.");
  await writeFile(`${main}/${name}.css`, `/* Self-hosted font snapshot. Licences: /fonts/licenses/. */\n${stylesheets[name]}`);
}
await mkdir(`${main}/licenses`, { recursive: true });
await batch([...families], async family => {
  const slug = family.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const location of [`ofl/${slug}/OFL.txt`, `apache/${slug}/LICENSE.txt`, `ofl/${slug}/LICENSE.txt`]) {
    const url = `https://raw.githubusercontent.com/google/fonts/main/${location}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (response.status === 404) continue;
    if (!response.ok) throw new Error(`Licence request failed for ${family}: HTTP ${response.status}`);
    await writeFile(`${main}/licenses/${slug}.txt`, await response.text());
    return;
  }
  throw new Error(`Cannot locate the redistribution licence for ${family}.`);
});
const manifest = {
  requests, families: [...families].sort(),
  files: [...new Map([...files.values()].map(file => [file.filename, file])).values()],
};
await writeFile(`${main}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
for (const file of manifest.files) await copyFile(`${main}/${file.filename}`, `${sandbox}/${file.filename}`);
await mkdir(`${sandbox}/licenses`, { recursive: true });
for (const family of families) {
  const slug = family.toLowerCase().replace(/[^a-z0-9]/g, "");
  await copyFile(`${main}/licenses/${slug}.txt`, `${sandbox}/licenses/${slug}.txt`);
}
for (const name of ["interface", "sandbox"]) await copyFile(`${main}/${name}.css`, `${sandbox}/${name}.css`);
console.log(JSON.stringify({ families: manifest.families.length, files: manifest.files.length, totalBytes: manifest.files.reduce((n, file) => n + file.bytes, 0), licenses: families.size }));
