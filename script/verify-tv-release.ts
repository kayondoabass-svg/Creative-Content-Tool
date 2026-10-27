import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { readGitHubDownloads } from "../server/github-downloads";

// Read-only verification: no credentials, uploads, tags, commits or publishing.
// Fetching a ZIP here is a real download and can increment its GitHub counter.
const pkg = JSON.parse(await readFile("packages/brightboard-tv/package.json", "utf8"));
const tag = process.argv[2] || `v${pkg.version}`;
if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error("Use a stable tag such as v1.0.0.");
const repo = "kayondoabass-svg/Brightboard-TV";
const headers = { Accept: "application/vnd.github+json", "User-Agent": "BrightboardTV-release-verification" };
const response = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, {
  headers, signal: AbortSignal.timeout(20_000), redirect: "error",
});
if (!response.ok) throw new Error(`Published ${tag} release unavailable (HTTP ${response.status}). Upload it manually first.`);
const release = await response.json();
if (release.draft || release.prerelease || release.tag_name !== tag) throw new Error("Expected a published stable release.");
const directory = path.resolve("generated-artifacts/brightboardtv", tag);
const sums = await readFile(path.join(directory, "SHA256SUMS.txt"), "utf8");
const remoteSums = await fetch(`https://github.com/${repo}/releases/download/${tag}/SHA256SUMS.txt`, {
  signal: AbortSignal.timeout(30_000),
});
if (!remoteSums.ok || await remoteSums.text() !== sums) throw new Error("Published checksums differ from the prepared bundle.");
for (const kind of ["source", "prebuilt"]) {
  const name = `BrightboardTV-${kind}-${tag}.zip`;
  const asset = release.assets.find((item: { name: string }) => item.name === name);
  if (!asset || asset.state !== "uploaded") throw new Error(`Missing uploaded asset: ${name}`);
  const expected = sums.split("\n").find(line => line.endsWith(`  ${name}`))?.slice(0, 64);
  if (!expected || !/^[a-f0-9]{64}$/.test(expected)) throw new Error(`Missing local checksum: ${name}`);
  const download = await fetch(`https://github.com/${repo}/releases/download/${tag}/${name}`, {
    signal: AbortSignal.timeout(120_000),
  });
  if (!download.ok) throw new Error(`Public download failed: ${name} (HTTP ${download.status})`);
  const hash = createHash("sha256");
  if (!download.body) throw new Error(`Empty download: ${name}`);
  const reader = download.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      hash.update(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (hash.digest("hex") !== expected) throw new Error(`Checksum mismatch: ${name}`);
  console.log(`Verified public download and SHA-256: ${name}`);
}
const counter = await readGitHubDownloads();
if (!counter.available) throw new Error(counter.error);
for (const kind of ["source", "prebuilt"]) {
  const name = `BrightboardTV-${kind}-${tag}.zip`;
  const asset = counter.assets.find(item => item.release === tag && item.name === name);
  if (!asset) throw new Error(`Founder counter did not include ${name}`);
  console.log(`GitHub download_count: ${name}: ${asset.downloads}`);
}
console.log(`Founder counter total across all stable software releases: ${counter.total}`);
console.log("GitHub may update counts asynchronously; an already-running website caches totals for up to 15 minutes.");
