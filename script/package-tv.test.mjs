import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { publicFiles, validatePublicLock, packageTV } from "./package-tv.mjs";

test("release dependencies must be integrity-pinned public npm tarballs", () => {
  const lock = resolved => ({ packages: { "node_modules/example": { resolved, integrity: "sha512-fixture" } } });
  assert.doesNotThrow(() => validatePublicLock(lock("https://registry.npmjs.org/example/-/example-1.0.0.tgz")));
  for (const url of [
    "https://package-firewall.internal/example.tgz", "file:../example",
    "https://user:password@registry.npmjs.org/example.tgz",
    "http://registry.npmjs.org/example.tgz", "https://registry.npmjs.org/example.tgz?token=value",
  ]) assert.throws(() => validatePublicLock(lock(url)));
  assert.throws(() => validatePublicLock({ packages: { "node_modules/example": { link: true } } }));
});

test("fresh ZIPs enforce the independent boundary and never retain deleted files", async () => {
  const temp = await mkdtemp(path.join(tmpdir(), "tv-packaging-test-"));
  const root = path.join(temp, "core");
  const output = path.join(temp, "out");
  try {
    await mkdir(root);
    for (const name of publicFiles) {
      if ([".github", "public", "scripts", "server", "src"].includes(name)) {
        await mkdir(path.join(root, name));
        await writeFile(path.join(root, name, "public.txt"), name);
      } else await writeFile(path.join(root, name), name);
    }
    await writeFile(path.join(root, "package.json"), JSON.stringify({ version: "1.0.0" }));
    await writeFile(path.join(root, "package-lock.json"), JSON.stringify({ version: "1.0.0", packages: { "": { version: "1.0.0" } } }));
    await mkdir(path.join(root, "dist"));
    await mkdir(path.join(root, "build"));
    await writeFile(path.join(root, "dist/index.html"), "compiled browser");
    await writeFile(path.join(root, "build/server.cjs"), "compiled relay");
    await writeFile(path.join(root, ".env"), "must not ship");
    await mkdir(path.join(root, ".git"));
    await writeFile(path.join(root, "private-website.ts"), "must not ship");
    await writeFile(path.join(root, "src/removed.ts"), "old file");
    await packageTV({ root, output, versioned: true });
    await rm(path.join(root, "src/removed.ts"));
    const result = await packageTV({ root, output, versioned: true });
    for (const [name, prebuilt] of [[result.source, false], [result.prebuilt, true]]) {
      const file = path.join(output, name);
      execFileSync("unzip", ["-tq", file]);
      const entries = execFileSync("unzip", ["-Z1", file], { encoding: "utf8" }).trim().split("\n");
      assert.ok(entries.every(entry => entry.startsWith("Brightboard-TV/") && !entry.includes("..")));
      assert.ok(entries.every(entry => {
        const top = entry.split("/")[1];
        return !top || publicFiles.includes(top) || prebuilt && ["dist", "build"].includes(top);
      }));
      assert.ok(!entries.some(entry => /removed|private-website|\.env|\/\.git\//.test(entry)));
      assert.equal(entries.includes("Brightboard-TV/dist/index.html"), prebuilt);
      assert.equal(entries.includes("Brightboard-TV/build/server.cjs"), prebuilt);
      assert.ok(entries.includes("Brightboard-TV/LICENSE"));
      assert.ok(entries.includes("Brightboard-TV/package-lock.json"));
    }
    const original = await readFile(path.join(output, result.source));
    await symlink(path.join(root, ".env"), path.join(root, "src/leak"));
    await assert.rejects(packageTV({ root, output, versioned: true }), /Non-regular release entry/);
    assert.deepEqual(await readFile(path.join(output, result.source)), original);
    await rm(path.join(root, "src/leak"));
    await writeFile(path.join(root, "src/.env.local"), "must not ship");
    await assert.rejects(packageTV({ root, output }), /Forbidden release entry/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
