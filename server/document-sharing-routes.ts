import express, { type Express, type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import type { Pool } from "pg";
import { ShareError } from "./document-sharing-store";
import { CloudflareSharingStore, type SharingStore } from "./cloudflare-sharing-store";

export function registerDocumentSharing(app: Express, _pool: Pool, getUser: (id: string) => Promise<any>, storeOverride?: SharingStore) {
  const store = storeOverride || new CloudflareSharingStore(), router = express.Router();
  router.use((_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); next(); });
  router.use(async (req: any, res, next) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Sign in to share or open BrightBoard documents." });
      const user = await getUser(req.session.userId);
      if (!user) return res.status(401).json({ error: "Please sign in again." });
      if (!user.emailVerified) return res.status(403).json({ error: "Verify your email before sharing or opening documents." });
      if (!["GET", "HEAD"].includes(req.method)) {
        let originOK = true;
        try { if (req.headers.origin) originOK = new URL(req.headers.origin).host === req.get("host"); } catch { originOK = false; }
        if (!originOK || req.headers["sec-fetch-site"] === "cross-site") return res.status(403).json({ error: "Open BrightBoard directly to change document sharing." });
        if (!req.is("application/json") && req.method !== "DELETE") return res.status(415).json({ error: "Use JSON for sharing requests." });
      }
      res.locals.viewer = user;
      next();
    } catch (error) { next(error); }
  });
  router.use(rateLimit({ windowMs: 60_000, limit: 80, standardHeaders: true, legacyHeaders: false }));
  router.use(express.json({ limit: "17mb" }));
  const handle = (fn: (req: any, res: any) => Promise<any>): RequestHandler => (req, res, next) => { void fn(req, res).catch(next); };
  router.get("/", handle(async (_req, res) => res.json(await store.list(res.locals.viewer))));
  router.post("/", handle(async (req, res) => res.status(201).json(await store.create(res.locals.viewer, req.body))));
  router.get("/:id", handle(async (req, res) => res.json(await store.get(res.locals.viewer, req.params.id, typeof req.query.revision === "string" ? req.query.revision : undefined))));
  router.put("/:id", handle(async (req, res) => res.json(await store.save(res.locals.viewer, req.params.id, req.body, req.get("If-Match")))));
  router.patch("/:id", handle(async (req, res) => res.json(await store.configure(res.locals.viewer, req.params.id, req.body))));
  router.post("/:id/requests", handle(async (req, res) => res.json(await store.request(res.locals.viewer, req.params.id, req.body))));
  router.post("/:id/requests/:userId", handle(async (req, res) => res.json(await store.decide(res.locals.viewer, req.params.id, req.params.userId, req.body))));
  router.post("/:id/members", handle(async (req, res) => res.json(await store.invite(res.locals.viewer, req.params.id, req.body))));
  router.delete("/:id/members/:memberId", handle(async (req, res) => res.json(await store.removeMember(res.locals.viewer, req.params.id, req.params.memberId))));
  router.post("/:id/fork", handle(async (req, res) => res.status(201).json(await store.fork(res.locals.viewer, req.params.id))));
  router.delete("/:id", handle(async (req, res) => { await store.remove(res.locals.viewer, req.params.id); res.status(204).end(); }));
  router.get("/:id/export", handle(async (req, res) => {
    const document = await store.get(res.locals.viewer, req.params.id, typeof req.query.revision === "string" ? req.query.revision : undefined);
    if (document.role !== "owner" && !document.allowDownload) throw new ShareError(403, "The owner has not allowed downloads.");
    res.attachment(`BrightBoard-${document.id}-${document.revision}.json`).json({ format: "brightboard-shared-document", version: 1, title: document.title, kind: document.kind, content: document.content });
  }));
  router.use((error: any, _req: any, res: any, _next: any) => {
    if (error instanceof ShareError) return res.status(error.status).json({ error: error.message, canRequest: error.canRequest });
    if (error.type === "entity.too.large") return res.status(413).json({ error: "Shared documents are limited to 16 MB including assets." });
    if (error instanceof SyntaxError) return res.status(400).json({ error: "Invalid document JSON." });
    console.error("[document sharing]", error?.message);
    res.status(503).json({ error: "Sharing is temporarily unavailable. Your local work is unchanged; keep a project backup and try again." });
  });
  app.use("/api/sharing/documents", router);
}
