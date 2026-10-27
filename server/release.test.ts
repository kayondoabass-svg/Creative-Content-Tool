import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSync } from "esbuild";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

for (const mode of ["valid", "missing", "mismatch", "replaced-after-startup"]) {
  test(`production release identity: ${mode}`, t => {
    const root = mkdtempSync(path.join(tmpdir(), "running-release-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(path.join(root, "dist"));
    const bundle = path.join(root, "dist/index.cjs");
    buildSync({
      entryPoints: ["server/release.ts"], outfile: bundle,
      platform: "node", format: "cjs", bundle: true,
    });
    const hash = createHash("sha256").update(readFileSync(bundle)).digest("hex");
    if (mode !== "missing") writeFileSync(path.join(root, ".release.json"), JSON.stringify({
      schema: 1, revision: "a".repeat(40),
      files: { "dist/index.cjs": mode === "mismatch" ? "wrong" : hash },
    }));
    const output = execFileSync(process.execPath, ["-e", `
      const { registerReleaseRoute } = require("./dist/index.cjs");
      ${mode === "replaced-after-startup" ? `
        require("node:fs").writeFileSync(".release.json", JSON.stringify({
          schema: 1, revision: "${"b".repeat(40)}",
          files: {"dist/index.cjs": "${hash}"}
        }));
        require("node:fs").writeFileSync("dist/index.cjs", "replaced bundle");
      ` : ""}
      let handler;
      registerReleaseRoute({get: (url, fn) => {
        if(url !== "/api/release") throw new Error("Wrong route");
        handler = fn;
      }});
      const result = {status: 200, headers: {}};
      handler({}, {
        setHeader: (k,v) => result.headers[k] = v,
        status(n) { result.status = n; return this; },
        json(body) { result.body = body; }
      });
      console.log(JSON.stringify(result));
    `], { cwd: root, env: { ...process.env, NODE_ENV: "production" }, encoding: "utf8" });
    const result = JSON.parse(output);
    assert.equal(result.headers["Cache-Control"], "no-store");
    assert.equal(result.status, ["missing", "mismatch"].includes(mode) ? 503 : 200);
    if (result.status === 200) {
      assert.deepEqual(result.body, { schema: 1, revision: "a".repeat(40), serverSha256: hash });
    }
  });
}
