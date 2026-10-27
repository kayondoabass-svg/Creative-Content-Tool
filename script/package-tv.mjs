import { cp, mkdir, mkdtemp, readFile, rm, readdir, lstat, rename } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// Only this independent, public core belongs in the downloadable software.
export const publicFiles = [
  ".github", ".gitignore", "ASSETS.md", "CHANGELOG.md", "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md", "index.html", "LICENSE", "NOTICE", "package.json",
  "package-lock.json", "public", "README.md", "RUN-PREBUILT.md", "scripts",
  "SECURITY.md", "server", "src", "THIRD_PARTY_NOTICES.md", "tsconfig.json",
  "UPLOAD-TO-GITHUB.md", "RELEASE-NOTES.md", "vite.config.mts",
];

export function validatePublicLock(lock) {
  for (const [name, entry] of Object.entries(lock.packages || {})) {
    if (!name) continue;
    if (entry.link || !entry.resolved || !entry.integrity) {
      throw new Error(`Non-portable dependency in BrightboardTV lockfile: ${name}`);
    }
    const url = new URL(entry.resolved);
    if (url.origin !== "https://registry.npmjs.org" || url.username || url.password ||
        url.search || url.hash || !url.pathname.endsWith(".tgz")) {
      throw new Error(`Dependency must use a public npm tarball: ${name}`);
    }
  }
}

// Fail closed instead of following a symlink or silently shipping private/local
// material accidentally placed inside an otherwise allowed public directory.
async function validateTree(directory) {
  for (const name of await readdir(directory)) {
    if (/^(?:\.git|\.env(?:\..*)?|node_modules|\.npmrc|\.DS_Store|.*\.(?:pem|key|zip|sql))$/i.test(name)) {
      throw new Error(`Forbidden release entry: ${name}`);
    }
    const file = path.join(directory, name);
    const info = await lstat(file);
    if (info.isSymbolicLink() || (!info.isFile() && !info.isDirectory())) {
      throw new Error(`Non-regular release entry: ${name}`);
    }
    if (info.isDirectory()) await validateTree(file);
  }
}

export async function packageTV({
  root = path.resolve("packages/brightboard-tv"),
  output = path.resolve("dist/releases"),
  versioned = false,
} = {}) {
  const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) throw new Error("Expected a stable x.y.z BrightboardTV version.");
  const lock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
  validatePublicLock(lock);
  if (lock.version !== pkg.version || lock.packages?.[""]?.version !== pkg.version) {
    throw new Error("BrightboardTV package and lockfile versions must match.");
  }
  await mkdir(output, { recursive: true });
  // Stage on the output filesystem so the final rename is atomic even when
  // /tmp and the workspace are different mounts.
  const temp = await mkdtemp(path.join(output, ".brightboardtv-release-"));
  const destination = path.join(temp, "Brightboard-TV");
  try {
    await mkdir(destination);
    for (const name of publicFiles) {
      const info = await lstat(path.join(root, name));
      if (info.isSymbolicLink()) throw new Error(`Non-regular release entry: ${name}`);
      await cp(path.join(root, name), path.join(destination, name), { recursive: true });
    }
    await validateTree(destination);
    const zip = promisify(execFile);
    const suffix = versioned ? `-v${pkg.version}` : "";
    const source = `BrightboardTV-source${suffix}.zip`;
    const prebuilt = `BrightboardTV-prebuilt${suffix}.zip`;
    // Always create new archives. Updating an existing ZIP retains removed files.
    await zip("zip", ["-qr", path.join(temp, source), "Brightboard-TV"], { cwd: temp });
    for (const name of ["dist", "build"]) {
      if ((await lstat(path.join(root, name))).isSymbolicLink()) throw new Error(`Non-regular release entry: ${name}`);
      await cp(path.join(root, name), path.join(destination, name), { recursive: true });
    }
    await validateTree(destination);
    await zip("zip", ["-qr", path.join(temp, prebuilt), "Brightboard-TV"], { cwd: temp });
    await rename(path.join(temp, source), path.join(output, source));
    await rename(path.join(temp, prebuilt), path.join(output, prebuilt));
    console.log("Packaged public BrightboardTV source and prebuilt ZIPs.");
    return { version: pkg.version, source, prebuilt };
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
