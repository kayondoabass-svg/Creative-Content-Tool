import type { Express, RequestHandler } from "express";
import path from "node:path";
import { stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { pool } from "./db";
import { readGitHubDownloads } from "./github-downloads";

const files = {
  source: "BrightboardTV-source.zip",
  prebuilt: "BrightboardTV-prebuilt.zip",
} as const;

let ready: Promise<unknown> | undefined;
function prepare() {
  if (!ready) {
    ready = pool.query(`CREATE TABLE IF NOT EXISTS tv_software_downloads (
      id uuid PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('source','prebuilt')),
      file_name text NOT NULL, size_bytes bigint NOT NULL,
      status text NOT NULL CHECK (status IN ('started','served','failed')),
      created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
    )`).catch(error => { ready = undefined; throw error; });
  }
  return ready;
}

export function registerTVDownloadRoutes(app: Express, ownerOnly: RequestHandler, directory = path.resolve("dist/releases"), githubReader = readGitHubDownloads) {
  app.get("/api/brightboardtv/download/:kind", async (req, res) => {
    const kind = req.params.kind;
    if (kind !== "source" && kind !== "prebuilt") {
      res.status(404).json({ error: "Unknown software download." });
      return;
    }
    const filename = files[kind];
    const file = path.resolve(directory, filename);
    let size: number;
    try { size = (await stat(file)).size; }
    catch {
      res.status(503).json({ error: "Software download unavailable. Please try again later." });
      return;
    }
    // HEAD probes must never inflate totals. Count full responses, not clicks.
    const tracked = req.method === "GET";
    const id = randomUUID();
    if (tracked) {
      try {
        await prepare();
        await pool.query(`INSERT INTO tv_software_downloads(id,kind,file_name,size_bytes,status)
          VALUES($1,$2,$3,$4,'started')`, [id, kind, filename, size]);
      } catch (error) {
        console.error("[TV downloads] Could not record download start", error);
        res.status(503).json({ error: "Downloads are temporarily unavailable. Please try again later." });
        return;
      }
    }
    res.setHeader("Cache-Control", "no-store");
    res.download(file, filename, { acceptRanges: false, lastModified: false, etag: false }, error => {
      if (tracked) {
        const status = !error && res.statusCode === 200 ? "served" : "failed";
        void pool.query(`UPDATE tv_software_downloads SET status=$2,finished_at=now() WHERE id=$1`,
          [id, status]).catch(dbError => console.error("[TV downloads] Could not record transfer result", dbError));
      }
      if (error && !res.headersSent && !res.destroyed) {
        res.status(500).json({ error: "The download could not be completed. Please try again." });
      }
    });
  });

  app.get("/api/owner/tv-downloads", ownerOnly, async (req, res) => {
    if (req.query.page !== undefined && (typeof req.query.page !== "string" || !/^[1-9]\d{0,5}$/.test(req.query.page))) {
      res.status(400).json({ error: "Invalid page." }); return;
    }
    const page = Number(req.query.page || 1);
    const pageSize = 25;
    try {
      await prepare();
      const [summary, events, github] = await Promise.all([
        pool.query(`SELECT count(*)::int AS requests,
          count(*) FILTER (WHERE status='served')::int AS served,
          count(*) FILTER (WHERE status='failed')::int AS failed,
          count(*) FILTER (WHERE status='started')::int AS incomplete,
          count(*) FILTER (WHERE status='served' AND created_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')::int AS today,
          count(*) FILTER (WHERE status='served' AND kind='source')::int AS source,
          count(*) FILTER (WHERE status='served' AND kind='prebuilt')::int AS prebuilt
          FROM tv_software_downloads`),
        pool.query(`SELECT id,kind,file_name,size_bytes,status,created_at,finished_at
          FROM tv_software_downloads ORDER BY created_at DESC,id DESC LIMIT $1 OFFSET $2`,
          [pageSize, (page - 1) * pageSize]),
        githubReader(),
      ]);
      res.setHeader("Cache-Control", "private, no-store");
      res.json({ totals: summary.rows[0], downloads: events.rows, page, pageSize, github });
    } catch (error) {
      console.error("[TV downloads] Report unavailable", error);
      res.status(500).json({ error: "Could not load software download records." });
    }
  });
}
