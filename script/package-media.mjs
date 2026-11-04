import { cp, readFile, writeFile, readdir, lstat, mkdir, mkdtemp, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve("packages/brightboard-media");
const files = ["src", "scripts", "package.json", "index.html", "README.md", "LICENSE", "THIRD-PARTY-NOTICES.txt", "brand-logo.png"];
async function audit(directory) {
  for (const name of await readdir(directory)) {
    if (/^(?:\.env.*|\.git|node_modules|\.npmrc|.*\.(?:pem|key|sql))$/i.test(name)) throw new Error(`Forbidden public file: ${name}`);
    const file = path.join(directory, name), info = await lstat(file);
    if (info.isSymbolicLink()) throw new Error("Symlinks are forbidden in public packages.");
    if (info.isDirectory()) await audit(file);
    else {
      if (!info.isFile()) throw new Error("Only regular public files are allowed.");
      if (!name.endsWith(".png")) {
        const text = await readFile(file, "utf8");
        if (/(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|bbm_live_[A-Za-z0-9_-]{30,}|sk-[A-Za-z0-9]{30,}|postgres(?:ql)?:\/\/[^ \n"']+:[^ \n"']+@)/.test(text)) throw new Error(`Credential-like material in ${name}`);
        if (/\bfrom\s+["'](?:@\/|@shared|(?:\.\.\/){2,})/.test(text)) throw new Error(`Private cross-boundary import in ${name}`);
      }
    }
  }
}
export async function packageMedia(output = path.resolve("dist/releases")) {
  await mkdir(output, { recursive: true });
  const stage = await mkdtemp(path.join(output, ".media-stage-"));
  const zip = promisify(execFile), names = ["BrightBoard-Media-Studio-source-v1.0.0.zip", "BrightBoard-Media-Studio-prebuilt-v1.0.0.zip"];
  try {
    const source = path.join(stage, "source", "BrightBoard-Media-Studio");
    await mkdir(source, { recursive: true });
    for (const name of files) await cp(path.join(root, name), path.join(source, name), { recursive: true });
    const prebuilt = path.join(stage, "prebuilt", "BrightBoard-Media-Studio");
    await cp(path.join(root, "dist"), prebuilt, { recursive: true });
    await audit(source); await audit(prebuilt);
    for (const [i, folder] of ["source", "prebuilt"].entries()) {
      const file = path.join(output, names[i]);
      await rm(file, { force: true });
      await zip("zip", ["-qr", file, "BrightBoard-Media-Studio"], { cwd: path.join(stage, folder) });
    }
    const hashes = await Promise.all(names.map(async name => `${createHash("sha256").update(await readFile(path.join(output, name))).digest("hex")}  ${name}`));
    await writeFile(path.join(output, "BrightBoard-Media-Studio-SHA256SUMS.txt"), hashes.join("\n") + "\n");
    console.log("Audited public Media Studio source/prebuilt ZIPs: no environment files or private imports.");
    return names;
  } finally { await rm(stage, { recursive: true, force: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await packageMedia(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
