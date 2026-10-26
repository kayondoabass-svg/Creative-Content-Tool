import type { Express, RequestHandler } from "express";
import type { ExactLogoSources, GeneratedContent } from "../shared/schema";
import { logoAdjustmentSchema } from "../shared/schema";
import { recomposeExactLogo } from "./exactLogoService";

interface LogoStorage {
  getContent(id: number): Promise<GeneratedContent | undefined>;
  getLogoSources(id: number, userId: string): Promise<ExactLogoSources | undefined>;
  updateLogoComposition(id: number, userId: string, content: string): Promise<GeneratedContent | undefined>;
}

export function registerLogoAdjustmentRoutes(app: Express, storage: LogoStorage, limiter: RequestHandler) {
  app.post("/api/content/:id/logo", limiter, async (req: any, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid content ID" });
    const adjustment = logoAdjustmentSchema.safeParse(req.body);
    if (!adjustment.success) return res.status(400).json({ error: "Choose a position, width from 5–40%, and margin from 0–15%." });
    try {
      const item = await storage.getContent(id);
      if (!item || item.userId !== userId) return res.status(404).json({ error: "Content not found" });
      const sources = await storage.getLogoSources(id, userId);
      if (!sources) return res.status(409).json({ error: "Original logo sources are unavailable for this design. They expire after 24 hours or when the private source storage limit is reached." });
      const data = JSON.parse(item.content);
      const composition = await recomposeExactLogo(sources, adjustment.data);
      data.b64_json = composition.b64_json;
      if (composition.images) data.images = composition.images;
      data.options = { ...data.options, ...adjustment.data, resolvedLogoPosition: composition.resolvedLogoPosition };
      data.logoEditable = true;
      const saved = await storage.updateLogoComposition(id, userId, JSON.stringify(data));
      if (!saved) return res.status(409).json({ error: "This design or its editable sources expired or were deleted. Refresh your library." });
      return res.json(saved);
    } catch (error) {
      console.error("Logo adjustment failed:", error);
      return res.status(500).json({ error: "Could not save the logo adjustment. Your previous design has not changed." });
    }
  });
}
