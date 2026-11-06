import type { Express } from "express";
import type { JobQueue } from "./jobQueue";

export function registerPrivateAccessRoutes(app: Express, jobs: JobQueue) {
  // Retired bootstrap routes must never be usable with a key from source code.
  for (const route of ["emergency-delete", "emergency-reset"]) {
    app.post(`/api/auth/${route}`, (_req, res) => {
      res.setHeader("Cache-Control", "private, no-store");
      res.status(410).json({ error: "Emergency recovery is disabled. Use the normal verified password recovery flow." });
    });
  }
  app.get("/api/generate/job/:jobId", (req: any, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: "Please sign in to view generation progress." });
    const job = jobs.getOwnedJob(String(req.params.jobId), userId);
    if (!job) return res.status(404).json({ error: "Job not found or expired" });
    res.json(job);
  });
}
