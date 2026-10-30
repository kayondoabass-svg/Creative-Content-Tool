import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/** Independent source identity: never reads private repository history or env. */
export function buildInfo(root) {
  const hash = createHash("sha256");
  const visit = relative => {
    const file = path.join(root, relative);
    const info = lstatSync(file);
    if (info.isSymbolicLink()) throw new Error(`Unsupported build input: ${relative}`);
    if (info.isDirectory()) {
      for (const name of readdirSync(file).sort()) visit(`${relative}/${name}`);
    } else {
      hash.update(relative).update("\0").update(readFileSync(file)).update("\0");
    }
  };
  for (const name of ["src", "server", "scripts", "public", "package.json", "package-lock.json", "vite.config.mts", "tsconfig.json"]) visit(name);
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) throw new Error("Expected stable application version");
  return { schema: 1, product: "BrightboardTV", version: pkg.version, buildId: hash.digest("hex").slice(0, 20) };
}
