import type { Express } from "express";
import path from "node:path";
import { publicFlashcard } from "../shared/flashcard-catalog";

export function registerFlashcardCatalog(app: Express, directory = path.resolve("public/flashcard-images")) {
  // Terminal handler: an unknown name must never fall through to static/Vite.
  app.use("/flashcard-images", (req, res) => {
    const match = /^\/([a-z]+)\/([a-z]+)\.png$/.exec(req.path);
    if (!["GET", "HEAD"].includes(req.method) || !match || !publicFlashcard(match[1], match[2])) {
      res.status(404).end(); return;
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.sendFile(path.join(directory, match[1], `${match[2]}.png`), error => {
      if (error && !res.headersSent) res.status(404).end();
    });
  });
}
