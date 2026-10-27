import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { packageTV } from "./package-tv.mjs";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.join(project, "packages/brightboard-tv");
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) throw new Error("Expected a stable x.y.z version.");
const output = path.join(project, "generated-artifacts/brightboardtv", `v${pkg.version}`);
await mkdir(output, { recursive: true });
// Build only the independent core. Never export or operate on root Git history.
execFileSync(process.execPath, [path.join(root, "scripts/build.mjs")], { cwd: root, stdio: "inherit" });
const { source, prebuilt } = await packageTV({ root, output, versioned: true });
const checksums = [];
for (const name of [source, prebuilt]) {
  execFileSync("unzip", ["-tq", path.join(output, name)], { stdio: "inherit" });
  const bytes = await readFile(path.join(output, name));
  checksums.push(`${createHash("sha256").update(bytes).digest("hex")}  ${name}`);
}
await writeFile(path.join(output, "SHA256SUMS.txt"), `${checksums.join("\n")}\n`);
await cp(path.join(root, "RELEASE-NOTES.md"), path.join(output, "RELEASE-NOTES.md"));
console.log(`Manual upload bundle ready: ${path.relative(project, output)}`);
console.log(checksums.join("\n"));
console.log("Nothing has been published. Follow packages/brightboard-tv/UPLOAD-TO-GITHUB.md.");
