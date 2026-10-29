import express, { type RequestHandler, type Express } from "express";
import rateLimit from "express-rate-limit";
import { canSaveTVLibrary } from "./tv-library-access";
import { LibraryError, TVLibraryStore, validLibraryId } from "./tv-library-store";

export function registerTVLibraryRoutes(app: Express, store: TVLibraryStore, getUser: (id: string) => Promise<any>) {
  const router = express.Router();
  router.use((_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); next(); });
  router.use(async (req: any, res, next) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Sign in to open your account lesson library." });
      const user = await getUser(req.session.userId);
      if (!user) return res.status(401).json({ error: "Please sign in again." });
      // Deny cookie-authenticated cross-site writes, even with a valid session.
      if (!["GET", "HEAD"].includes(req.method)) {
        if (req.headers["sec-fetch-site"] === "cross-site" ||
          (req.headers.origin && new URL(req.headers.origin).host !== req.get("host"))) {
          return res.status(403).json({ error: "Open BrightBoard directly to change your library." });
        }
        if (!canSaveTVLibrary(user)) return res.status(403).json({ error: "A current paid BrightBoard plan is required to save, rename or delete account lessons. You can still open and export existing copies." });
      }
      res.locals.libraryUserId = user.id;
      next();
    } catch (error) { next(error); }
  });
  router.use(rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false }));
  router.use((req, res, next) => {
    if (["PUT", "PATCH"].includes(req.method) && !req.is("application/json")) return res.status(415).json({ error: "Upload lessons as JSON." });
    next();
  });
  router.use(express.json({ limit: "65mb", type: "application/json" }));
  // A large upload may finish after a subscription expires or is cancelled.
  // Recheck just before the mutation as well as before allocating its body.
  router.use(async (req: any, res, next) => {
    if (["GET", "HEAD"].includes(req.method)) return next();
    try {
      const current = await getUser(res.locals.libraryUserId);
      if (!canSaveTVLibrary(current)) return res.status(403).json({ error: "Your paid access ended during this request. Download a backup; existing account lessons remain available to open and export." });
      next();
    } catch (error) { next(error); }
  });
  router.param("id", (_req, _res, next, id) => next(validLibraryId(id) ? undefined : new LibraryError(400, "Invalid saved lesson identifier.")));
  const handle = (fn: (req: any, res: any) => Promise<unknown>): RequestHandler => (req, res, next) => { void fn(req, res).catch(next); };
  const revision = (req: any) => typeof req.headers["if-match"] === "string" ? req.headers["if-match"] : undefined;
  router.get("/", handle(async (_req, res) => res.json(await store.list(res.locals.libraryUserId))));
  router.get("/:id", handle(async (req, res) => res.json(await store.get(res.locals.libraryUserId, req.params.id))));
  router.put("/:id", handle(async (req, res) => res.json(await store.save(res.locals.libraryUserId, req.params.id, req.body, revision(req)))));
  router.patch("/:id", handle(async (req, res) => res.json(await store.rename(res.locals.libraryUserId, req.params.id, req.body?.title, revision(req)))));
  router.delete("/:id", handle(async (req, res) => { await store.delete(res.locals.libraryUserId, req.params.id, revision(req)); res.status(204).end(); }));
  router.use((error: any, _req: any, res: any, _next: any) => {
    if (error instanceof LibraryError) return res.status(error.status).json({ error: error.message });
    if (error.type === "entity.too.large") return res.status(413).json({ error: "Lesson upload is too large. Maximum lesson size is 64 MB." });
    if (error instanceof SyntaxError) return res.status(400).json({ error: "Invalid lesson JSON." });
    console.error("[TV library] Request failed", error);
    res.status(503).json({ error: "Account library is unavailable. Your device copies are unchanged. Download a .bbtv backup and retry later." });
  });
  app.use("/api/tv/library", router);
}
