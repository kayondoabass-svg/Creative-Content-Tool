// Derive an independent npm lock from already-resolved packages, without
// installing/upgrading the main app just to export its standalone component.
import { readFile, writeFile } from "node:fs/promises";
const base = JSON.parse(await readFile("package-lock.json", "utf8"));
const pkg = JSON.parse(await readFile("packages/brightboard-tv/package.json", "utf8"));
const packages = { "": { name: pkg.name, version: pkg.version, license: pkg.license,
  dependencies: pkg.dependencies, devDependencies: pkg.devDependencies, engines: pkg.engines } };
function resolve(name, from = "") {
  let context = from;
  while (context) {
    const candidate = `${context}/node_modules/${name}`;
    if (base.packages[candidate]) return candidate;
    const index = context.lastIndexOf("/node_modules/");
    context = index < 0 ? "" : context.slice(0, index);
  }
  return base.packages[`node_modules/${name}`] ? `node_modules/${name}` : null;
}
const runtime = new Set();
function walk(name, from, dev, optional = false) {
  const key = resolve(name, from);
  if (!key) { if (!optional) throw new Error(`Missing resolved public dependency: ${name}`); return; }
  const already = !!packages[key], wasRuntime = runtime.has(key);
  if (!dev) runtime.add(key);
  if (already && (dev || wasRuntime)) return;
  const entry = structuredClone(base.packages[key]);
  // The workspace firewall approved this package, but its private proxy URL
  // cannot be resolved by independent users of the public source release.
  if (entry.resolved) {
    const url = new URL(entry.resolved);
    if (url.hostname === "package-firewall.replit.internal" && url.pathname.startsWith("/npm/") &&
        !url.username && !url.password && !url.search && !url.hash) {
      entry.resolved = `https://registry.npmjs.org/${url.pathname.slice(5)}`;
    }
  }
  packages[key] = entry;
  for (const dep of Object.keys(entry.dependencies || {})) walk(dep, key, dev);
  for (const dep of Object.keys(entry.optionalDependencies || {})) walk(dep, key, dev, true);
  for (const dep of Object.keys(entry.peerDependencies || {})) walk(dep, key, dev, !!entry.peerDependenciesMeta?.[dep]?.optional);
}
for (const name of Object.keys(pkg.dependencies)) walk(name, "", false);
for (const name of Object.keys(pkg.devDependencies)) walk(name, "", true);
for (const [key, value] of Object.entries(packages)) if (key) {
  if (runtime.has(key)) delete value.dev; else value.dev = true;
}
await writeFile("packages/brightboard-tv/package-lock.json", JSON.stringify({
  name: pkg.name, version: pkg.version, lockfileVersion: 3, requires: true, packages,
}, null, 2) + "\n");
console.log(`Standalone lock contains ${Object.keys(packages).length - 1} resolved packages.`);
