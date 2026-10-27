import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSync } from "esbuild";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { createManifest } = require("../scripts/release-manifest.cjs");

test("release verifier passes real production static serving and hosted TV health over HTTP", t => {
  const root = mkdtempSync(path.join(tmpdir(), "release-http-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, "dist"));
  symlinkSync(path.resolve("dist/public"), path.join(root, "dist/public"), "dir");
  const verifier = path.resolve("scripts/verify-release.cjs");
  // No full application boot: keep this regression check independent of DB,
  // production settings, jobs and authentication providers.
  buildSync({
    stdin: {
      resolveDir: process.cwd(),
      contents: `
        import express from "express";
        import { registerReleaseRoute } from "./server/release";
        import { serveStatic } from "./server/static";
        import { createTvRelay } from "./packages/brightboard-tv/server/relay";
        const { verify } = require(${JSON.stringify(verifier)});
        const fs = require("node:fs");
        const app = express();
        const relay = createTvRelay({hostedLibrary: true});
        registerReleaseRoute(app);
        app.use("/api/tv", relay.router);
        app.use("/tv", express.static("dist/public/tv"));
        app.get("/sitemap.xml", (_req, res) => res.type("application/xml").send(
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://www.brightboardapp.com/brightboardtv</loc></url></urlset>'
        ));
        serveStatic(app);
        const server = app.listen(0, "127.0.0.1", async () => {
          try {
            await verify("http://127.0.0.1:" + server.address().port,
              JSON.parse(fs.readFileSync(".release.json", "utf8")));
            console.log("REAL_HTTP_VERIFIED");
          } catch (error) { console.error(error); process.exitCode = 1; }
          finally { relay.close(); server.close(); }
        });
      `,
    },
    outfile: path.join(root, "dist/index.cjs"),
    platform: "node", format: "cjs", bundle: true,
    external: [verifier],
    logLevel: "silent",
  });
  writeFileSync(path.join(root, ".release.json"), JSON.stringify(createManifest(root, "a".repeat(40))));
  const output = execFileSync(process.execPath, ["dist/index.cjs"], {
    cwd: root, encoding: "utf8", timeout: 20000,
    env: { ...process.env, NODE_ENV: "production" },
  });
  assert.match(output, /REAL_HTTP_VERIFIED/);
});
