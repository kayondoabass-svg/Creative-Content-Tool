import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { Express } from "express";

// Capture once during process startup, never per request. An old PM2 process
// must not claim a new revision after the files on disk have been replaced.
const release = (() => {
  if (process.env.NODE_ENV !== "production") return null;
  try {
    const manifest = JSON.parse(readFileSync(".release.json", "utf8"));
    const serverSha256 = createHash("sha256").update(readFileSync(__filename)).digest("hex");
    if (manifest.schema !== 1 || !/^[a-f0-9]{40}$/.test(manifest.revision) ||
        manifest.files?.["dist/index.cjs"] !== serverSha256) return null;
    return Object.freeze({ schema: 1, revision: manifest.revision, serverSha256 });
  } catch {
    return null;
  }
})();

export function registerReleaseRoute(app: Express) {
  app.get("/api/release", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!release) return res.status(503).json({ error: "Release identity unavailable" });
    return res.json(release);
  });
}
