import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// Only this independent, public core belongs in the downloadable software.
const publicFiles = [
  ".github", ".gitignore", "ASSETS.md", "CHANGELOG.md", "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md", "index.html", "LICENSE", "NOTICE", "package.json",
  "package-lock.json", "public", "README.md", "RUN-PREBUILT.md", "scripts",
  "SECURITY.md", "server", "src", "THIRD_PARTY_NOTICES.md", "tsconfig.json",
  "UPLOAD-TO-GITHUB.md", "vite.config.mts",
];

export async function packageTV() {
  const root = path.resolve("packages/brightboard-tv");
  const lock = await readFile(path.join(root, "package-lock.json"), "utf8");
  if (lock.includes("package-firewall.")) {
    throw new Error("BrightboardTV lockfile contains internal registry URLs; fix portability before packaging.");
  }
  const output = path.resolve("dist/releases");
  await mkdir(output, { recursive: true });
  const temp = await mkdtemp(path.join(tmpdir(), "brightboardtv-release-"));
  const destination = path.join(temp, "Brightboard-TV");
  try {
    await mkdir(destination);
    for (const name of publicFiles) {
      await cp(path.join(root, name), path.join(destination, name), { recursive: true });
    }
    const zip = promisify(execFile);
    await zip("zip", ["-qr", path.join(output, "BrightboardTV-source.zip"), "Brightboard-TV"], { cwd: temp });
    for (const name of ["dist", "build"]) {
      await cp(path.join(root, name), path.join(destination, name), { recursive: true });
    }
    await zip("zip", ["-qr", path.join(output, "BrightboardTV-prebuilt.zip"), "Brightboard-TV"], { cwd: temp });
    console.log("Packaged public BrightboardTV source and prebuilt ZIPs.");
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
