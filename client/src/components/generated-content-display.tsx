import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, Check, RefreshCw, Loader2, FileDown, Play, Sparkles, FileText, Image as ImageIcon, Film, Gamepad2, Crown, Pencil, Plus, Palette, X } from "lucide-react";
import { useState, useEffect, useRef, type MouseEvent } from "react";
import type { ContentType, Slide, Activity, StoryboardFrame, Worksheet, GameType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { SlideshowModal } from "./slideshow-modal";
import { VideoExportModal } from "./video-export-modal";
import { GamePlayerModal } from "./game-player-modal";
import { BrightBoardLogo } from "./brightboard-logo";
import { MindmapCanvas, type MindmapData, BRANCH_COLORS } from "./mindmap-canvas";
import { useSubscription } from "@/hooks/use-subscription";
import { useTranslation } from "react-i18next";
import pptxgen from "pptxgenjs";
import JSZip from "jszip";
import { apiRequest } from "@/lib/queryClient";

interface QuickStartChip {
  label: string;
  prompt: string;
  type: ContentType;
  emoji: string;
}

const QUICK_START_CHIPS: QuickStartChip[] = [
  { label: "Fractions Worksheet (Grade 4)", prompt: "Fractions for Grade 4", type: "worksheet", emoji: "📝" },
  { label: "Animal Habitats Lesson Slides", prompt: "Animal habitats for Grade 3", type: "presentation", emoji: "🦁" },
  { label: "Multiplication Mind Map", prompt: "Multiplication concepts for Grade 3", type: "mindmap", emoji: "🗺️" },
  { label: "Solar System Image", prompt: "Solar system planets diagram", type: "image", emoji: "🪐" },
  { label: "Photosynthesis Activity", prompt: "Photosynthesis quiz game for Grade 5", type: "activity", emoji: "🎮" },
  { label: "Story Writing Tips", prompt: "Creative story writing tips for Grade 6", type: "text", emoji: "✍️" },
];

interface GeneratedContentDisplayProps {
  type: ContentType;
  content: string;
  isLoading: boolean;
  onRegenerate?: () => void;
  isFirstTimeUser?: boolean;
  onPromptSelect?: (prompt: string, type: ContentType) => void;
}

export function GeneratedContentDisplay({
  type,
  content,
  isLoading,
  onRegenerate,
  isFirstTimeUser,
  onPromptSelect,
}: GeneratedContentDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [showVideoExport, setShowVideoExport] = useState(false);
  const [showGamePlayer, setShowGamePlayer] = useState(false);
  const { toast } = useToast();

  const getActivityData = () => {
    if (type !== "activity") return null;
    try {
      const data = JSON.parse(content);
      return {
        title: data.title || data.gameName || "Interactive Game",
        gameType: (data.gameType || "brainBattle") as GameType,
        gameData: data,
      };
    } catch {
      return null;
    }
  };

  const getPresentationData = () => {
    if (type !== "presentation") return { slides: [], title: "", transition: undefined, transitionDelay: undefined, tapToReveal: undefined, layout: undefined, gameType: undefined };
    try {
      const data = JSON.parse(content);
      return {
        slides: data.slides || [],
        title: data.title || "Presentation",
        transition: data.transition,
        transitionDelay: data.transitionDelay,
        tapToReveal: !!data.tapToReveal,
        layout: data.layout,
        gameType: data.gameType,
      };
    } catch {
      return { slides: [], title: "", transition: undefined, transitionDelay: undefined, tapToReveal: undefined, layout: undefined, gameType: undefined };
    }
  };

  const getStoryboardData = () => {
    if (type !== "storyboard") return null;
    try {
      const data = JSON.parse(content);
      return {
        title: data.title || "Video",
        description: data.description,
        frames: data.frames || [],
      };
    } catch {
      return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center min-h-[400px] animate-pulse-glow">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary via-accent to-chart-4 animate-gradient" />
          <Loader2 className="h-10 w-10 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
        </div>
        <p className="mt-6 text-lg font-medium">Creating your content...</p>
        <p className="mt-2 text-sm text-muted-foreground">This may take a moment</p>
      </Card>
    );
  }

  if (!content) {
    if (isFirstTimeUser && onPromptSelect) {
      return (
        <Card className="p-6 flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-b from-muted/10 to-muted/30">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <p className="text-xl font-semibold text-foreground">Welcome to BrightBoard!</p>
          <p className="mt-1 mb-6 text-sm text-muted-foreground text-center max-w-sm">
            You're all set. Try one of these examples or describe your own lesson topic below.
          </p>
          <div className="flex flex-wrap gap-2 justify-center max-w-lg" data-testid="quick-start-chips">
            {QUICK_START_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => onPromptSelect(chip.prompt, chip.type)}
                data-testid={`chip-${chip.type}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors text-sm font-medium shadow-sm"
              >
                <span>{chip.emoji}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </Card>
      );
    }

    return null;
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (type === "mindmap") {
      const container = document.getElementById("mindmap-svg-root");
      const svg = container?.querySelector("svg");
      if (!svg) {
        toast({ title: "Error", description: "Could not find mind map to export.", variant: "destructive" });
        return;
      }
      const viewBox = svg.getAttribute("viewBox") || "0 0 1500 1300";
      const parts = viewBox.split(" ");
      const svgW = parseFloat(parts[2]) || 1500;
      const svgH = parseFloat(parts[3]) || 1300;
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("width", String(svgW));
      clone.setAttribute("height", String(svgH));
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
      const svgStr = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = svgW * scale;
        canvas.height = svgH * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, svgW, svgH);
        URL.revokeObjectURL(svgUrl);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `brightboard-mindmap-${Date.now()}.jpg`;
          a.click();
        }, "image/jpeg", 0.95);
      };
      img.src = svgUrl;
      return;
    }
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brightboard-${type}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenVideoExport = () => {
    const storyboardData = getStoryboardData();
    if (!storyboardData) {
      toast({
        title: "Error",
        description: "Could not parse storyboard data.",
        variant: "destructive",
      });
      return;
    }
    
    const framesWithImages = storyboardData.frames.filter((f: any) => f.image);
    if (framesWithImages.length === 0) {
      toast({
        title: "No images available",
        description: "Generate images for your storyboard first before exporting as video.",
        variant: "destructive",
      });
      return;
    }
    
    setShowVideoExport(true);
  };

  const handleDownloadPPT = async () => {
    try {
      const data = JSON.parse(content);
      const slides: Slide[] = data.slides || [];
      const tapToReveal: boolean = !!data.tapToReveal;
      const transition: string = data.transition || "none";
      const transitionDelay: number = data.transitionDelay || 0;

      if (slides.length === 0) {
        toast({
          title: "No slides found",
          description: "This presentation doesn't have any slides to download.",
          variant: "destructive",
        });
        return;
      }

      // Compress + re-encode images via canvas so they embed cleanly in PPTX
      // (raw 1024x1024 PNGs from gpt-image-1 can be 3-5 MB each and cause corruption)
      const compressImageForPptx = (src: string): Promise<string> => {
        return new Promise((resolve) => {
          if (!src) { resolve(src); return; }
          const img = new Image();
          img.onload = () => {
            try {
              const MAX = 900;
              const scale = Math.min(1, MAX / Math.max(img.naturalWidth || MAX, img.naturalHeight || MAX));
              const w = Math.round((img.naturalWidth || MAX) * scale);
              const h = Math.round((img.naturalHeight || MAX) * scale);
              const canvas = document.createElement("canvas");
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext("2d");
              if (!ctx) { resolve(src); return; }
              ctx.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL("image/jpeg", 0.88));
            } catch {
              resolve(src);
            }
          };
          img.onerror = () => resolve(src);
          img.src = src;
        });
      };

      const pptx = new pptxgen();
      pptx.title = data.title || "Presentation";
      pptx.author = "BrightBoard";
      pptx.layout = "LAYOUT_16x9";

      const layout = data.layout || "single";
      const slideData = slides as (Slide & { images?: string[] })[];

      // LAYOUT_16x9 = 10" × 5.625". Keep all content within TV-safe margins
      // (TVs apply overscan that crops ~5% of edges). Safe area: x 0.4–9.6, y 0.3–5.3
      const TITLE_Y = 0.28;
      const CONTENT_Y = 1.02;
      const CONTENT_H = 3.92; // ends at y=4.94, well inside 5.625"
      const CONTENT_W = 9.2;
      const CONTENT_X = 0.4;

      const addSlideContent = async (slide: Slide & { images?: string[] }, visibleBullets: string[]) => {
        const pptSlide = pptx.addSlide();
        const hasImage = !!(slide.image || (slide.images && slide.images.length > 0));
        const hasContent = visibleBullets.length > 0;

        // ── Game slide PPTX rendering ─────────────────────────────────────
        const slideType = (slide as any).slideType as string | undefined;
        const gd = (slide as any).gameData;
        if (data.layout === "game" && slideType) {
          const CX = 0.4, CW = 9.2;

          if (slideType === "jeopardyBoard") {
            pptSlide.background = { color: "003399" };
            pptSlide.addText(slide.title || "JEOPARDY!", {
              x: CX, y: 0.15, w: CW, h: 0.7,
              fontSize: 36, bold: true, color: "FFD700", align: "center",
            });
            const cats = (gd?.categories || []).slice(0, 4);
            const colW = CW / cats.length;
            cats.forEach((cat: any, ci: number) => {
              pptSlide.addText(cat.name.toUpperCase(), {
                x: CX + ci * colW, y: 1.0, w: colW - 0.05, h: 0.6,
                fontSize: 13, bold: true, color: "FFFFFF", align: "center",
                fill: { color: "0044BB" },
              });
              [100, 200, 300, 400, 500].forEach((pts, ri) => {
                pptSlide.addText(`${pts}`, {
                  x: CX + ci * colW, y: 1.7 + ri * 0.75, w: colW - 0.05, h: 0.68,
                  fontSize: 28, bold: true, color: "FFD700", align: "center",
                  fill: { color: "0033AA" },
                });
              });
            });
          } else if (slideType === "jeopardyClue") {
            pptSlide.background = { color: "003399" };
            pptSlide.addText(`${gd?.category || ""} — ${gd?.points || ""} pts`, {
              x: CX, y: 0.2, w: CW, h: 0.45, fontSize: 16, color: "AACCFF", align: "center",
            });
            pptSlide.addText(gd?.clue || slide.title, {
              x: CX, y: 1.0, w: CW, h: 2.4,
              fontSize: 28, bold: true, color: "FFFFFF", align: "center", valign: "middle", wrap: true,
            });
            pptSlide.addText(`✅ ${gd?.answer || ""}`, {
              x: CX, y: 3.6, w: CW, h: 0.7,
              fontSize: 20, bold: true, color: "FFD700", align: "center",
              fill: { color: "002288" },
            });
          } else if (slideType === "quizQuestion") {
            pptSlide.addText(gd?.question || slide.title, {
              x: CX, y: 0.2, w: CW, h: 1.0,
              fontSize: 22, bold: true, color: "1a1a2e", align: "center", wrap: true,
            });
            const boxColors = ["3B82F6", "22C55E", "F97316", "EF4444"];
            const labels = ["A", "B", "C", "D"];
            const opts = gd?.options || {};
            const vals = [opts.a || "", opts.b || "", opts.c || "", opts.d || ""];
            const correct = (gd?.correct || "a").toLowerCase();
            const optKeys = ["a", "b", "c", "d"];
            vals.forEach((val: string, i: number) => {
              const col = i % 2, row = Math.floor(i / 2);
              const bx = CX + col * (CW / 2 + 0.05);
              const by = 1.35 + row * 1.1;
              const isCorrect = optKeys[i] === correct;
              pptSlide.addText([
                { text: `${labels[i]}  `, options: { bold: true, fontSize: 20, color: "FFFFFF" } },
                { text: val, options: { fontSize: 16, color: "FFFFFF" } },
                ...(isCorrect ? [{ text: " ✅", options: { fontSize: 16, color: "FFFFFF" } }] : []),
              ], {
                x: bx, y: by, w: CW / 2 - 0.1, h: 0.95,
                fill: { color: isCorrect ? "16A34A" : boxColors[i] },
                valign: "middle", inset: 0.15,
              });
            });
            if (gd?.explanation) {
              pptSlide.addText(gd.explanation, {
                x: CX, y: 3.65, w: CW, h: 0.5,
                fontSize: 13, color: "555555", italic: true, align: "center", wrap: true,
              });
            }
          } else if (slideType === "trueFalse") {
            pptSlide.background = { color: "1E293B" };
            pptSlide.addText(gd?.statement || slide.title, {
              x: CX, y: 0.5, w: CW, h: 2.0,
              fontSize: 26, bold: true, color: "FFFFFF", align: "center", valign: "middle", wrap: true,
            });
            const isTrue = !!gd?.answer;
            pptSlide.addText("✅  TRUE", {
              x: CX, y: 2.7, w: CW / 2 - 0.15, h: 0.85,
              fontSize: 24, bold: true, color: "FFFFFF", align: "center",
              fill: { color: isTrue ? "16A34A" : "4B5563" },
            });
            pptSlide.addText("❌  FALSE", {
              x: CX + CW / 2 + 0.05, y: 2.7, w: CW / 2 - 0.1, h: 0.85,
              fontSize: 24, bold: true, color: "FFFFFF", align: "center",
              fill: { color: !isTrue ? "DC2626" : "4B5563" },
            });
            if (gd?.explanation) {
              pptSlide.addText(gd.explanation, {
                x: CX, y: 3.7, w: CW, h: 0.5,
                fontSize: 13, color: "94A3B8", italic: true, align: "center", wrap: true,
              });
            }
          } else if (slideType === "memoryPair") {
            pptSlide.addText(gd?.word || slide.title, {
              x: CX, y: 0.5, w: CW / 2 - 0.15, h: 3.5,
              fontSize: 36, bold: true, color: "FFFFFF", align: "center", valign: "middle",
              fill: { color: "7C3AED" },
            });
            pptSlide.addText(gd?.definition || "", {
              x: CX + CW / 2 + 0.05, y: 0.5, w: CW / 2 - 0.1, h: 3.5,
              fontSize: 18, color: "FFFFFF", align: "center", valign: "middle", wrap: true,
              fill: { color: "0D9488" },
            });
          } else {
            // Default game slide: colored header + bullets
            pptSlide.background = { color: "F5F3FF" };
            pptSlide.addText(slide.title || "Slide", {
              x: CX, y: TITLE_Y, w: CW, h: 0.68, fontSize: 28, bold: true, color: "4C1D95",
            });
            if (hasContent) {
              pptSlide.addText(
                visibleBullets.map(pt => ({ text: pt, options: { bullet: true, fontSize: 18, color: "333333", breakLine: true } })),
                { x: CX, y: CONTENT_Y, w: CW, h: CONTENT_H, valign: "top" }
              );
            }
          }

          pptSlide.addText("brightboardapp.com", {
            x: 6.8, y: 4.98, w: 2.8, h: 0.28,
            fontSize: 9, color: "aaaaaa", align: "right", italic: true,
          });
          if (slide.notes) pptSlide.addNotes(slide.notes);
          return;
        }
        // ── End game slide rendering ──────────────────────────────────────

        pptSlide.addText(slide.title || "Slide", {
          x: CONTENT_X, y: TITLE_Y, w: CONTENT_W, h: 0.68,
          fontSize: 30, bold: true, color: "1a1a2e",
        });

        if (hasImage && layout === "single" && slide.image) {
          const imgData = await compressImageForPptx(slide.image);
          if (hasContent) {
            const imgW = 4.55;
            const txtX = CONTENT_X + imgW + 0.18;
            pptSlide.addImage({ data: imgData, x: CONTENT_X, y: CONTENT_Y, w: imgW, h: CONTENT_H });
            pptSlide.addText(
              visibleBullets.map(point => ({ text: point, options: { bullet: true, fontSize: 17, color: "333333", breakLine: true } })),
              { x: txtX, y: CONTENT_Y, w: CONTENT_X + CONTENT_W - txtX, h: CONTENT_H, valign: "top" }
            );
          } else {
            pptSlide.addImage({ data: imgData, x: CONTENT_X, y: CONTENT_Y, w: CONTENT_W, h: CONTENT_H, sizing: { type: "contain", w: CONTENT_W, h: CONTENT_H } });
          }
        } else if (hasImage && layout === "grid" && slide.images && slide.images.length > 0) {
          const imgSize = 2.0;
          const gapX = 0.15;
          const gridPos = [
            { x: CONTENT_X,               y: CONTENT_Y },
            { x: CONTENT_X + imgSize + gapX, y: CONTENT_Y },
            { x: CONTENT_X,               y: CONTENT_Y + imgSize + gapX },
            { x: CONTENT_X + imgSize + gapX, y: CONTENT_Y + imgSize + gapX },
          ];
          await Promise.all(slide.images.slice(0, 4).map(async (img, idx) => {
            const imgData = await compressImageForPptx(img);
            pptSlide.addImage({ data: imgData, x: gridPos[idx].x, y: gridPos[idx].y, w: imgSize, h: imgSize });
          }));
          if (hasContent) {
            const txtX = CONTENT_X + imgSize * 2 + gapX * 2 + 0.1;
            pptSlide.addText(
              visibleBullets.map(point => ({ text: point, options: { bullet: true, fontSize: 15, color: "333333", breakLine: true } })),
              { x: txtX, y: CONTENT_Y, w: CONTENT_X + CONTENT_W - txtX, h: CONTENT_H, valign: "top" }
            );
          }
        } else if (layout === "infographic") {
          const infSlide = slide as Slide & { infographicType?: string; tableHeaders?: string[]; tableRows?: string[][]; stats?: { value: string; label: string; color: string }[]; facts?: { title: string; text: string }[]; compLeft?: string; compRight?: string; compLeftItems?: string[]; compRightItems?: string[] };
          const infType = infSlide.infographicType || "facts";

          if (infType === "table" && infSlide.tableHeaders && infSlide.tableRows) {
            const headers = infSlide.tableHeaders.map(h => ([{ text: h, options: { bold: true, color: "ffffff", fill: { color: "3b82f6" }, fontSize: 13 } }]));
            const rows = infSlide.tableRows.map(row => row.map(cell => ([{ text: cell, options: { fontSize: 12, color: "333333" } }])));
            pptSlide.addTable([headers, ...rows] as any, { x: CONTENT_X, y: CONTENT_Y, w: CONTENT_W, h: CONTENT_H, border: { color: "cccccc", pt: 1 }, fill: { color: "f8fafc" } });
          } else if (infType === "stats" && infSlide.stats) {
            const stats = infSlide.stats.slice(0, 5);
            const boxW = CONTENT_W / stats.length - 0.1;
            stats.forEach((stat, i) => {
              const bx = CONTENT_X + i * (boxW + 0.1);
              pptSlide.addText(stat.value, { x: bx, y: CONTENT_Y + 0.5, w: boxW, h: 1.4, fontSize: 36, bold: true, color: (stat.color || "#3b82f6").replace("#", ""), align: "center" });
              pptSlide.addText(stat.label, { x: bx, y: CONTENT_Y + 2.1, w: boxW, h: 0.8, fontSize: 13, color: "555555", align: "center", wrap: true });
            });
          } else if (infType === "comparison" && infSlide.compLeft && infSlide.compRight) {
            const colW = CONTENT_W / 2 - 0.15;
            pptSlide.addText(infSlide.compLeft, { x: CONTENT_X, y: CONTENT_Y, w: colW, h: 0.44, fontSize: 16, bold: true, color: "ffffff", fill: { color: "3b82f6" }, align: "center" });
            pptSlide.addText(infSlide.compRight, { x: CONTENT_X + colW + 0.3, y: CONTENT_Y, w: colW, h: 0.44, fontSize: 16, bold: true, color: "ffffff", fill: { color: "ef4444" }, align: "center" });
            (infSlide.compLeftItems || []).forEach((item, i) => {
              pptSlide.addText(item, { x: CONTENT_X, y: CONTENT_Y + 0.55 + i * 0.62, w: colW, h: 0.55, fontSize: 13, color: "333333", fill: { color: "eff6ff" }, wrap: true });
            });
            (infSlide.compRightItems || []).forEach((item, i) => {
              pptSlide.addText(item, { x: CONTENT_X + colW + 0.3, y: CONTENT_Y + 0.55 + i * 0.62, w: colW, h: 0.55, fontSize: 13, color: "333333", fill: { color: "fef2f2" }, wrap: true });
            });
          } else if (infSlide.facts) {
            const facts = infSlide.facts.slice(0, 4);
            const half = Math.ceil(facts.length / 2);
            facts.forEach((fact, i) => {
              const col = i >= half ? 1 : 0;
              const row = i >= half ? i - half : i;
              const bx = CONTENT_X + col * (CONTENT_W / 2 + 0.1);
              const by = CONTENT_Y + row * (CONTENT_H / half + 0.1);
              const bw = CONTENT_W / 2 - 0.15;
              const bh = CONTENT_H / half - 0.1;
              pptSlide.addText([{ text: fact.title + "\n", options: { bold: true, fontSize: 14, color: "1e40af" } }, { text: fact.text, options: { fontSize: 12, color: "444444" } }], { x: bx, y: by, w: bw, h: bh, fill: { color: "f0f9ff" }, inset: 0.12, valign: "top", wrap: true });
            });
          } else if (hasContent) {
            pptSlide.addText(
              visibleBullets.map(point => ({ text: point, options: { bullet: true, fontSize: 18, color: "333333", breakLine: true } })),
              { x: CONTENT_X, y: CONTENT_Y, w: CONTENT_W, h: CONTENT_H, valign: "top" }
            );
          }
        } else if (hasContent) {
          pptSlide.addText(
            visibleBullets.map(point => ({ text: point, options: { bullet: true, fontSize: 20, color: "333333", breakLine: true } })),
            { x: CONTENT_X, y: CONTENT_Y, w: CONTENT_W, h: CONTENT_H, valign: "top" }
          );
        }

        if (slide.notes) pptSlide.addNotes(slide.notes);

        pptSlide.addText("brightboardapp.com", {
          x: 6.8, y: 4.98, w: 2.8, h: 0.28,
          fontSize: 9, color: "aaaaaa", align: "right", italic: true,
        });
      };

      for (const slide of slideData) {
        const allBullets = slide.content || [];
        if (tapToReveal && allBullets.length > 1) {
          for (let i = 1; i <= allBullets.length; i++) {
            await addSlideContent(slide, allBullets.slice(0, i));
          }
        } else {
          await addSlideContent(slide, allBullets);
        }
      }

      // Generate the PPTX as a Blob, then post-process with JSZip to inject transitions
      const needsPostProcess = transition && transition !== "none" || transitionDelay > 0;
      if (needsPostProcess) {
        const pptxBlob = await pptx.write({ outputType: "blob" }) as Blob;
        const zip = await JSZip.loadAsync(pptxBlob);

        // Map transition name to OpenXML element
        const transitionElementMap: Record<string, string> = {
          fade:  "<p:fade/>",
          slide: '<p:push dir="l"/>',
          zoom:  "<p:zoom/>",
          flip:  "<p:flip/>",
        };
        const transEl = transitionElementMap[transition] || "<p:fade/>";
        // advTm in ms; advClick="1" so manual advance still works; advAuto for auto-advance
        const advAttr = transitionDelay > 0 ? ` advTm="${transitionDelay * 1000}"` : "";
        const transitionXml = `<p:transition dur="400" advClick="1"${advAttr}>${transEl}</p:transition>`;

        // Inject into each slide XML
        const slideFiles = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide[0-9]+\.xml$/.test(f));
        await Promise.all(slideFiles.map(async (filePath) => {
          let xml = await zip.files[filePath].async("string");
          // Insert before closing </p:sld> tag
          xml = xml.replace(/<\/p:sld>/, `${transitionXml}</p:sld>`);
          zip.file(filePath, xml);
        }));

        const modifiedBlob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
        const url = URL.createObjectURL(modifiedBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${data.title || "presentation"}.pptx`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } else {
        await pptx.writeFile({ fileName: `${data.title || "presentation"}.pptx` });
      }

      toast({
        title: "Download started",
        description: tapToReveal
          ? "Downloaded with tap-to-reveal build slides — advance slides in PowerPoint to reveal each point."
          : "Your PowerPoint file is being downloaded.",
      });
    } catch (error) {
      console.error("Error generating PPT:", error);
      toast({
        title: "Download failed",
        description: "Could not create the PowerPoint file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderContent = () => {
    switch (type) {
      case "image":
        return <ImageContent content={content} />;
      case "presentation":
        return <PresentationContent content={content} />;
      case "text":
        return <TextContent content={content} />;
      case "activity":
        return <ActivityContent content={content} />;
      case "storyboard":
        return <StoryboardContent content={content} />;
      case "worksheet":
        return <WorksheetContent content={content} />;
      case "mindmap":
        return <MindmapContent content={content} />;
      default:
        return <TextContent content={content} />;
    }
  };

  return (
    <Card className="p-5 overflow-hidden">
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <Badge variant="secondary" className="capitalize">
          {type}
        </Badge>
        <div className="flex items-center gap-2 flex-wrap">
          {onRegenerate && (
            <Button variant="outline" size="sm" onClick={onRegenerate} data-testid="button-regenerate">
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Regenerate
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleCopy} data-testid="button-copy">
            {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
          {type === "presentation" && (
            <>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => setShowSlideshow(true)} 
                data-testid="button-present"
              >
                <Play className="h-4 w-4 mr-1.5" />
                Present
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPPT} data-testid="button-download-ppt">
                <FileDown className="h-4 w-4 mr-1.5" />
                Download PPT
              </Button>
            </>
          )}
          {type === "storyboard" ? (
            <>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleOpenVideoExport}
                data-testid="button-download-mp4"
              >
                <Film className="h-4 w-4 mr-1.5" />
                Export Video
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} data-testid="button-download">
                <Download className="h-4 w-4 mr-1.5" />
                Save Script
              </Button>
            </>
          ) : type === "worksheet" ? (
            <WorksheetDownloadButtons content={content} toast={toast} isPremium={isPremium} />
          ) : type === "activity" ? (
            <>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => setShowGamePlayer(true)}
                data-testid="button-play-game"
              >
                <Gamepad2 className="h-4 w-4 mr-1.5" />
                Play Game
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} data-testid="button-download">
                <Download className="h-4 w-4 mr-1.5" />
                Download
              </Button>
            </>
          ) : type !== "presentation" && (
            <Button variant="outline" size="sm" onClick={handleDownload} data-testid="button-download">
              <Download className="h-4 w-4 mr-1.5" />
              Download
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-auto max-h-[600px]">
        {renderContent()}
      </div>
      
      {type === "presentation" && (() => {
        const pd = getPresentationData();
        return (
          <SlideshowModal
            slides={pd.slides}
            title={pd.title}
            isOpen={showSlideshow}
            onClose={() => setShowSlideshow(false)}
            transition={pd.transition}
            transitionDelay={pd.transitionDelay}
            tapToReveal={pd.tapToReveal}
            gameType={pd.gameType}
          />
        );
      })()}
      
      {type === "storyboard" && (
        <VideoExportModal
          isOpen={showVideoExport}
          onClose={() => setShowVideoExport(false)}
          content={content}
          storyboardData={getStoryboardData()}
        />
      )}
      
      {type === "activity" && getActivityData() && (
        <GamePlayerModal
          isOpen={showGamePlayer}
          onClose={() => setShowGamePlayer(false)}
          gameType={getActivityData()!.gameType}
          gameData={getActivityData()!.gameData}
          title={getActivityData()!.title}
        />
      )}
    </Card>
  );
}

function ImageContent({ content }: { content: string }) {
  try {
    const data = JSON.parse(content);
    if (data.imageUrl || data.b64_json) {
      const imgSrc = data.imageUrl || `data:image/png;base64,${data.b64_json}`;
      return (
        <div className="space-y-4">
          <div className="rounded-lg overflow-hidden border relative">
            <img
              src={imgSrc}
              alt="Generated educational image"
              className="w-full h-auto"
              data-testid="img-generated"
            />
            <BrightBoardLogo show={true} />
          </div>
          {data.title && (
            <h3 className="font-semibold text-lg">{data.title}</h3>
          )}
          {data.description && (
            <p className="text-muted-foreground">{data.description}</p>
          )}
        </div>
      );
    }
  } catch {
    // Not JSON or no image data
  }
  return <TextContent content={content} />;
}

function PresentationContent({ content }: { content: string }) {
  try {
    const data = JSON.parse(content);
    const slides: (Slide & { images?: string[] })[] = data.slides || [];
    const layout = data.layout || "single";
    const style = data.style || "textAndImages";
    const imageStyle = data.imageStyle || "animation";
    const imageQuality = data.imageQuality || "hd";
    const transition = data.transition;
    const tapToReveal = data.tapToReveal;
    const hasWatermark = !!data.watermark;
    const showBranding = true;

    if (slides.length > 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xl">{data.title || "Presentation"}</h3>
              <div className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5" data-testid="logo-badge-title">
                <img src="/favicon.png" alt="BrightBoard" className="w-3.5 h-3.5 rounded" />
                <span className="text-muted-foreground text-[10px] font-medium">brightboardapp.com</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {style && (
                <Badge variant="outline" data-testid="badge-presentation-style">
                  {style === "textAndImages" ? "Text + Images" : style === "imagesOnly" ? "Images Only" : "Text Only"}
                </Badge>
              )}
              {layout && style !== "textOnly" && (
                <Badge variant="outline" data-testid="badge-presentation-layout">
                  {layout === "grid" ? "Grid Layout" : layout === "infographic" ? "Infographic" : "Single Image"}
                </Badge>
              )}
              {style !== "textOnly" && (
                <Badge variant="secondary" data-testid="badge-presentation-image-style">
                  {imageStyle === "reallife" ? "Real Life" : "Animation"}
                </Badge>
              )}
              {style !== "textOnly" && (
                <Badge variant="secondary" data-testid="badge-presentation-image-quality">
                  {imageQuality.toUpperCase()}
                </Badge>
              )}
              {transition && transition !== "none" && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" data-testid="badge-presentation-transition">
                  {transition.charAt(0).toUpperCase() + transition.slice(1)} Transition
                </Badge>
              )}
              {transition && transition !== "none" && data.transitionDelay > 0 && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" data-testid="badge-transition-delay">
                  {data.transitionDelay}s Delay
                </Badge>
              )}
              {tapToReveal && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" data-testid="badge-tap-to-reveal">
                  Tap to Reveal
                </Badge>
              )}
            </div>
          </div>
          <div className="grid gap-4">
            {data.slideLimitReached && (
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3" data-testid="banner-slide-limit">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">You requested {data.requestedSlides} slides, but free accounts are limited to {data.maxFreeSlides} slides.</p>
                  <p className="text-xs text-muted-foreground">Upgrade to Premium for up to 20 slides per presentation, HD/4K images, and more.</p>
                </div>
                <a href="/pricing" className="flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity" data-testid="link-upgrade-slides">
                  Upgrade
                </a>
              </div>
            )}
            {slides.map((slide, index) => (
              <Card key={index} className="p-4 bg-muted/30">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <h4 className="font-semibold text-base">{slide.title}</h4>
                  </div>
                  
                  {/* Infographic layout */}
                  {layout === "infographic" && (() => {
                    const infSlide = slide as Slide & { infographicType?: string; tableHeaders?: string[]; tableRows?: string[][]; stats?: { value: string; label: string; color: string }[]; facts?: { title: string; text: string }[]; compLeft?: string; compRight?: string; compLeftItems?: string[]; compRightItems?: string[] };
                    const infType = infSlide.infographicType || "facts";
                    return (
                      <div className="ml-11 space-y-2">
                        {infType === "table" && infSlide.tableHeaders && (
                          <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-blue-500 text-white">
                                  {infSlide.tableHeaders.map((h, hi) => <th key={hi} className="px-3 py-2 text-left font-semibold">{h}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {(infSlide.tableRows || []).map((row, ri) => (
                                  <tr key={ri} className={ri % 2 === 0 ? "bg-slate-50 dark:bg-slate-900" : ""}>
                                    {row.map((cell, ci) => <td key={ci} className="px-3 py-1.5 text-muted-foreground">{cell}</td>)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {infType === "stats" && infSlide.stats && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                            {infSlide.stats.map((stat, si) => (
                              <div key={si} className="rounded-xl border p-3 text-center" style={{ borderColor: stat.color + "66", background: stat.color + "11" }}>
                                <div className="text-2xl font-extrabold" style={{ color: stat.color }}>{stat.value}</div>
                                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {infType === "facts" && infSlide.facts && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {infSlide.facts.map((fact, fi) => (
                              <div key={fi} className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-3">
                                <div className="font-semibold text-sm text-blue-700 dark:text-blue-400 mb-1">{fact.title}</div>
                                <div className="text-xs text-muted-foreground">{fact.text}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {infType === "comparison" && infSlide.compLeft && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="rounded-t-lg bg-blue-500 text-white text-sm font-bold text-center py-1.5 px-2">{infSlide.compLeft}</div>
                              {(infSlide.compLeftItems || []).map((item, ii) => (
                                <div key={ii} className="border border-t-0 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 px-2 py-1.5 text-xs text-muted-foreground">{item}</div>
                              ))}
                            </div>
                            <div>
                              <div className="rounded-t-lg bg-red-500 text-white text-sm font-bold text-center py-1.5 px-2">{infSlide.compRight}</div>
                              {(infSlide.compRightItems || []).map((item, ii) => (
                                <div key={ii} className="border border-t-0 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 px-2 py-1.5 text-xs text-muted-foreground">{item}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        {slide.content && slide.content.length > 0 && (
                          <ul className="space-y-1">
                            {slide.content.map((point, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="text-primary mt-0.5">•</span>{point}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })()}

                  {/* Grid layout - multiple images */}
                  {layout !== "infographic" && layout === "grid" && slide.images && slide.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 ml-11">
                      {slide.images.map((img, imgIndex) => (
                        <div key={imgIndex} className="relative">
                          <img 
                            src={img} 
                            alt={`${slide.title} - Image ${imgIndex + 1}`}
                            className="w-full h-auto rounded-lg border shadow-sm aspect-square object-cover"
                            data-testid={`img-slide-${index}-${imgIndex}`}
                          />
                          <BrightBoardLogo show={showBranding} />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Single layout - image + text side by side */}
                  {layout !== "grid" && layout !== "infographic" && slide.image && slide.content && slide.content.length > 0 ? (
                    <div className="flex flex-col sm:flex-row gap-3 ml-11">
                      <div className="sm:w-2/5 flex-shrink-0 relative">
                        <img 
                          src={slide.image} 
                          alt={slide.title}
                          className="w-full h-auto rounded-lg border shadow-sm"
                          data-testid={`img-slide-${index}`}
                        />
                        <BrightBoardLogo show={showBranding} />
                      </div>
                      <ul className="space-y-1.5 sm:w-3/5">
                        {slide.content.map((point, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <>
                      {layout !== "grid" && layout !== "infographic" && slide.image && (
                        <div className="ml-11 relative inline-block">
                          <img 
                            src={slide.image} 
                            alt={slide.title}
                            className="w-full max-w-md h-auto rounded-lg border shadow-sm"
                            data-testid={`img-slide-${index}`}
                          />
                          <BrightBoardLogo show={showBranding} />
                        </div>
                      )}
                      {layout !== "infographic" && slide.content && slide.content.length > 0 && (
                        <ul className="space-y-1.5 ml-11">
                          {slide.content.map((point, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                  
                  {slide.notes && (
                    <p className="text-xs text-muted-foreground italic border-t pt-2 ml-11">
                      Speaker notes: {slide.notes}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
  } catch {
    // Not valid JSON
  }
  return <TextContent content={content} />;
}

function TextContent({ content }: { content: string }) {
  try {
    const data = JSON.parse(content);
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {data.title && <h2 className="text-xl font-bold mb-3">{data.title}</h2>}
        <div className="whitespace-pre-wrap">{data.content || data.text || content}</div>
      </div>
    );
  } catch {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    );
  }
}

function ActivityContent({ content }: { content: string }) {
  try {
    const data = JSON.parse(content);
    const game = data;
    const gameType = game.gameType || game.options?.gameType || "brainBattle";

    const gameTypeLabels: Record<string, string> = {
      luckySpinner: "Lucky Spinner",
      mysteryBox: "Mystery Box",
      memoryMatch: "Memory Match",
      quickCatch: "Quick Catch",
      factOrFib: "Fact or Fib",
      wordHunt: "Word Hunt",
      letterRescue: "Letter Rescue",
      treasureChest: "Treasure Chest",
      letterScramble: "Letter Scramble",
      popAndLearn: "Pop & Learn",
      brainBattle: "Brain Battle",
      missingPiece: "Missing Piece",
    };

    const renderGameContent = () => {
      switch (gameType) {
        case "luckySpinner":
          return game.wheelSegments?.map((seg: any, i: number) => (
            <Card key={i} className="p-3 bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ backgroundColor: seg.color || "#8B5CF6" }}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{seg.text}</p>
                  {seg.question && <p className="text-sm text-muted-foreground mt-1">Q: {seg.question}</p>}
                  {seg.answer && <p className="text-sm text-accent mt-1">A: {seg.answer}</p>}
                </div>
              </div>
            </Card>
          ));

        case "mysteryBox":
        case "treasureChest":
          const boxes = game.boxes || game.chests || [];
          return (
            <div className="grid grid-cols-4 gap-2">
              {boxes.map((box: any, i: number) => (
                <Card key={i} className="p-2 text-center bg-gradient-to-br from-primary/20 to-accent/20 hover-elevate cursor-pointer">
                  <div className="font-bold text-lg">{box.number || i + 1}</div>
                  <p className="text-xs text-muted-foreground truncate">{box.question || box.content}</p>
                  <p className="text-xs text-accent mt-1">{box.points || box.reward}</p>
                </Card>
              ))}
            </div>
          );

        case "memoryMatch":
          return game.pairs?.map((pair: any, i: number) => (
            <div key={i} className="flex gap-2">
              <Card className="flex-1 p-3 bg-primary/10 text-center">
                <p className="font-medium">{pair.card1}</p>
              </Card>
              <div className="flex items-center text-muted-foreground">↔</div>
              <Card className="flex-1 p-3 bg-accent/10 text-center">
                <p className="font-medium">{pair.card2}</p>
              </Card>
            </div>
          ));

        case "factOrFib":
          return game.statements?.map((stmt: any, i: number) => (
            <Card key={i} className="p-3 bg-muted/30">
              <div className="flex items-start gap-3">
                <Badge variant={stmt.isTrue ? "default" : "destructive"} className="flex-shrink-0">
                  {stmt.isTrue ? "FACT" : "FIB"}
                </Badge>
                <div>
                  <p className="font-medium">{stmt.statement}</p>
                  {stmt.explanation && <p className="text-sm text-muted-foreground mt-1">{stmt.explanation}</p>}
                </div>
              </div>
            </Card>
          ));

        case "wordHunt":
          return (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Find these {game.words?.length} words in the grid:</p>
              <div className="flex flex-wrap gap-2">
                {game.words?.map((word: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-sm">{word}</Badge>
                ))}
              </div>
              {game.hints?.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium text-sm mb-2">Hints:</p>
                  {game.hints.map((h: any, i: number) => (
                    <p key={i} className="text-sm text-muted-foreground">{h.word}: {h.hint}</p>
                  ))}
                </div>
              )}
            </div>
          );

        case "letterRescue":
          return game.words?.map((item: any, i: number) => (
            <Card key={i} className="p-3 bg-muted/30">
              <p className="font-mono text-lg tracking-widest">{item.word?.split('').map(() => '_ ').join('')}</p>
              <p className="text-sm text-muted-foreground mt-1">Category: {item.category}</p>
              <p className="text-sm text-accent mt-1">Hint: {item.hint}</p>
              <p className="text-xs text-primary mt-2">Answer: {item.word}</p>
            </Card>
          ));

        case "letterScramble":
          return game.scrambles?.map((item: any, i: number) => (
            <Card key={i} className="p-3 bg-muted/30">
              <p className="font-mono text-xl tracking-widest text-center">{item.scrambled}</p>
              <p className="text-sm text-muted-foreground text-center mt-1">{item.hint}</p>
              <p className="text-sm text-accent text-center mt-2">Answer: {item.answer}</p>
            </Card>
          ));

        case "quickCatch":
        case "popAndLearn":
          const items = game.targets || game.balloons || [];
          return (
            <>
              {game.question && <p className="font-medium text-lg mb-3">{game.question}</p>}
              <div className="grid grid-cols-3 gap-2">
                {items.map((item: any, i: number) => (
                  <Card key={i} className={`p-3 text-center ${item.isCorrect ? 'bg-green-500/20 border-green-500' : 'bg-muted/30'}`} style={item.color ? { backgroundColor: item.color + '20' } : {}}>
                    <p className="font-medium">{item.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.points} pts</p>
                  </Card>
                ))}
              </div>
            </>
          );

        case "brainBattle":
          return game.questions?.map((q: any, i: number) => (
            <Card key={i} className="p-3 bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{q.question}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {q.options?.map((opt: string, j: number) => (
                      <Badge key={j} variant={j === q.correctIndex ? "default" : "secondary"} className="text-xs">
                        {opt}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{q.points} pts | {q.timeLimit}s</p>
                </div>
              </div>
            </Card>
          ));

        case "missingPiece":
          return game.sentences?.map((item: any, i: number) => (
            <Card key={i} className="p-3 bg-muted/30">
              <p className="font-medium">{item.sentence}</p>
              <p className="text-sm text-accent mt-1">Answer: {item.answer}</p>
              {item.hint && <p className="text-xs text-muted-foreground mt-1">Hint: {item.hint}</p>}
            </Card>
          ));

        default:
          return game.items?.map((item: any, i: number) => (
            <Card key={i} className="p-3 bg-muted/30">
              <p className="font-medium">{item.question}</p>
              <p className="text-sm text-accent mt-1">Answer: {item.answer}</p>
            </Card>
          ));
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="font-bold text-xl">{game.title}</h3>
          <Badge variant="outline" className="capitalize">{gameTypeLabels[gameType] || game.gameName || gameType}</Badge>
          {game.teamMode && <Badge variant="secondary" className="capitalize">{game.teamMode}</Badge>}
          {game.estimatedTime && <Badge variant="secondary">{game.estimatedTime}</Badge>}
        </div>
        
        {game.learningObjectives?.length > 0 && (
          <div className="bg-primary/10 rounded-lg p-3">
            <p className="font-medium text-sm mb-1">Learning Objectives:</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside">
              {game.learningObjectives.map((obj: string, i: number) => (
                <li key={i}>{obj}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="font-medium mb-2">How to Play:</p>
          <p className="text-muted-foreground whitespace-pre-line">{game.instructions}</p>
        </div>
        
        <div className="grid gap-3 mt-4">
          {renderGameContent()}
        </div>
        
        {game.tips?.length > 0 && (
          <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
            <p className="font-medium text-sm text-amber-600 dark:text-amber-400 mb-1">Teacher Tips:</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside">
              {game.tips.map((tip: string, i: number) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  } catch {
    return <TextContent content={content} />;
  }
}

function StoryboardContent({ content }: { content: string }) {
  try {
    const data = JSON.parse(content);
    const frames: StoryboardFrame[] = data.frames || [];
    const hasWatermark = !!data.watermark;

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-bold text-xl">{data.title || "Video Plan"}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              This is a planning document for creating your video. Use it as a script and guide for video production.
            </p>
          </div>
        </div>
        {data.description && (
          <p className="text-muted-foreground">{data.description}</p>
        )}
        
        <div className="flex flex-wrap gap-2">
          {data.duration && (
            <Badge variant="outline" data-testid="badge-duration">{data.duration}</Badge>
          )}
          {data.style && (
            <Badge variant="outline" data-testid="badge-style">{data.style}</Badge>
          )}
          {data.quality && (
            <Badge variant="outline" data-testid="badge-quality">{data.quality}</Badge>
          )}
          {data.targetAge && (
            <Badge variant="secondary" data-testid="badge-target-age">{data.targetAge}</Badge>
          )}
        </div>
        
        <div className="grid gap-4">
          {frames.map((frame, index) => (
            <Card key={index} className="p-4 bg-gradient-to-r from-muted/50 to-muted/20">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="flex-shrink-0 w-full sm:w-32 relative">
                  {frame.image ? (
                    <>
                      <img 
                        src={frame.image} 
                        alt={`Frame ${frame.frameNumber}`}
                        className="w-full h-auto rounded-lg border shadow-sm"
                        data-testid={`img-frame-${index}`}
                      />
                      <BrightBoardLogo show={true} />
                    </>
                  ) : (
                    <div className="w-full aspect-video sm:w-32 sm:h-24 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                      <span className="text-xs text-muted-foreground text-center px-2">
                        Frame {frame.frameNumber}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="font-medium text-sm">{frame.description}</p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Action:</strong> {frame.action}
                  </p>
                  {frame.dialogue && (
                    <p className="text-xs italic text-accent">
                      "{frame.dialogue}"
                    </p>
                  )}
                  {!frame.image && (
                    <p className="text-xs text-muted-foreground/70">
                      <strong>Visual:</strong> {frame.imagePrompt}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  } catch {
    return <TextContent content={content} />;
  }
}

// Worksheet download buttons component
function WorksheetDownloadButtons({ content, toast, isPremium }: { content: string; toast: any; isPremium?: boolean }) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      const data = JSON.parse(content);
      let text = `${data.title}\n${"=".repeat(data.title?.length || 10)}\n\n`;
      if (data.instructions) text += `Instructions: ${data.instructions}\n\n`;
      data.sections?.forEach((section: any) => {
        if (section.title) text += `${section.title}\n${"-".repeat(section.title.length)}\n`;
        section.content?.forEach((item: string, i: number) => {
          text += `${i + 1}. ${item}\n`;
        });
        if (section.answers?.length) {
          text += `\nAnswer Key:\n`;
          section.answers.forEach((a: string, i: number) => { text += `${i + 1}. ${a}\n`; });
        }
        text += "\n";
      });
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied!", description: "Worksheet text copied to clipboard. Paste into Google Docs or Word." });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const downloadAsPDF = async () => {
    setDownloading("pdf");
    try {
      const res = await apiRequest("POST", "/api/worksheet-to-pdf", { content });
      const data = await res.json();
      
      const link = document.createElement("a");
      link.href = data.file;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "Downloaded", description: "PDF file downloaded successfully." });
    } catch (error) {
      toast({ title: "Download failed", description: "Could not create PDF.", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const downloadAsImage = async () => {
    setDownloading("jpeg");
    try {
      const res = await apiRequest("POST", "/api/worksheet-to-image", { content });
      const data = await res.json();
      
      const link = document.createElement("a");
      link.href = data.file;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "Downloaded", description: "Image file downloaded successfully." });
    } catch (error) {
      toast({ title: "Download failed", description: "Could not create image.", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const downloadAsText = () => {
    try {
      const data = JSON.parse(content);
      let text = `${data.title}\n${"=".repeat(data.title.length)}\n\n`;
      text += `Instructions: ${data.instructions}\n\n`;
      
      data.sections?.forEach((section: any, idx: number) => {
        if (section.title) text += `${section.title}\n${"-".repeat(section.title.length)}\n`;
        section.content?.forEach((item: string, i: number) => {
          text += `${i + 1}. ${item}\n`;
        });
        text += "\n";
      });
      
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.title || "worksheet"}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({ title: "Downloaded", description: "Text file downloaded successfully." });
    } catch (error) {
      toast({ title: "Download failed", description: "Could not create text file.", variant: "destructive" });
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={downloadAsPDF} disabled={!!downloading} data-testid="button-download-pdf">
        {downloading === "pdf" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileText className="h-4 w-4 mr-1.5" />}
        PDF
      </Button>
      <Button variant="outline" size="sm" onClick={downloadAsImage} disabled={!!downloading} data-testid="button-download-jpeg">
        {downloading === "jpeg" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-1.5" />}
        JPEG
      </Button>
      <Button variant="outline" size="sm" onClick={copyToClipboard} disabled={copied} data-testid="button-copy-worksheet">
        {copied ? <Check className="h-4 w-4 mr-1.5 text-green-500" /> : <Copy className="h-4 w-4 mr-1.5" />}
        {copied ? "Copied!" : "Copy Text"}
      </Button>
    </div>
  );
}

// Worksheet content display
function WorksheetContent({ content }: { content: string }) {
  const { isPremium } = useSubscription();
  const [showLogo, setShowLogo] = useState(true);

  try {
    const data = JSON.parse(content);
    const sections = data.sections || [];
    const isBlackWhite = data.colorMode === "blackWhite";
    const hasImages = sections.some((s: any) => s.imageUrl);
    
    return (
      <div className="space-y-4" data-testid="worksheet-content">
        {/* Header with logo */}
        <div className="text-center border-b pb-4 relative">
          <h2 className="text-2xl font-bold">{data.title}</h2>
          {data.instructions && (
            <p className="text-muted-foreground mt-1 text-sm">{data.instructions}</p>
          )}
          <div className="flex gap-2 justify-center mt-2 flex-wrap">
            <Badge variant={isBlackWhite ? "outline" : "default"} data-testid="badge-color-mode">
              {isBlackWhite ? "Black & White" : "Colored"}
            </Badge>
            {hasImages && (
              <Badge variant="secondary" className="gap-1">
                <ImageIcon className="h-3 w-3" /> With Images
              </Badge>
            )}
          </div>
          {/* BrightBoard Logo Badge */}
          {showLogo && (
            <div className="flex items-center gap-1 justify-center mt-2" data-testid="logo-badge-worksheet">
              <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-full px-2.5 py-0.5">
                <img src="/logo.png" alt="BrightBoard" className="w-4 h-4 rounded" />
                <span className="text-purple-700 dark:text-purple-300 text-[10px] font-semibold">brightboardapp.com</span>
              </div>
            </div>
          )}
          {/* Premium logo toggle */}
          {isPremium && (
            <button
              onClick={() => setShowLogo(v => !v)}
              className="absolute top-0 right-0 text-[10px] text-muted-foreground hover:text-foreground underline"
              data-testid="button-toggle-logo"
            >
              {showLogo ? "Hide logo" : "Show logo"}
            </button>
          )}
        </div>
        
        <div className="space-y-6">
          {sections.map((section: any, idx: number) => (
            <Card 
              key={idx} 
              className={`p-4 ${isBlackWhite ? "bg-white border-2 border-black" : "bg-gradient-to-r from-muted/50 to-muted/20"}`}
              data-testid={`worksheet-section-${idx}`}
            >
              <div className={`flex gap-3 ${section.imageUrl ? "items-start" : ""}`}>
                {/* Section image (paid feature) */}
                {section.imageUrl && (
                  <img
                    src={section.imageUrl}
                    alt={section.title || "Illustration"}
                    className="w-24 h-24 object-cover rounded-lg border flex-shrink-0"
                    data-testid={`worksheet-section-image-${idx}`}
                  />
                )}
                <div className="flex-1">
                  {section.title && (
                    <h3 className={`font-semibold mb-3 ${isBlackWhite ? "text-black" : ""}`}>
                      {section.title}
                    </h3>
                  )}
                  
                  <div className="space-y-2">
                    {section.content?.map((item: string, i: number) => (
                      <div 
                        key={i} 
                        className={`p-2 rounded ${isBlackWhite ? "border border-black" : "bg-background/50"}`}
                      >
                        {section.type === "fillBlank" ? (
                          <p className="font-medium">
                            {i + 1}. {item.replace(/_+/g, (match: string) => `_${"_".repeat(Math.max(10, match.length))}_`)}
                          </p>
                        ) : section.type === "multipleChoice" ? (
                          <div>
                            <p className="font-medium">{i + 1}. {item}</p>
                          </div>
                        ) : section.type === "writingPrompt" ? (
                          <div>
                            <p className="font-medium">{item}</p>
                            <div className={`mt-2 h-24 rounded ${isBlackWhite ? "border-2 border-dashed border-black" : "border-2 border-dashed border-muted-foreground/30"}`} />
                          </div>
                        ) : section.type === "drawing" ? (
                          <div>
                            <p className="font-medium text-sm mb-2">{item}</p>
                            <div className={`h-32 rounded ${isBlackWhite ? "border-2 border-black" : "border-2 border-dashed border-muted-foreground/30 bg-muted/20"}`} />
                          </div>
                        ) : (
                          <p>{i + 1}. {item}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {section.answers && section.answers.length > 0 && (
                    <details className="mt-3">
                      <summary className="text-sm text-muted-foreground cursor-pointer">Answer Key</summary>
                      <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                        {section.answers.map((answer: string, i: number) => (
                          <p key={i}>{i + 1}. {answer}</p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  } catch {
    return <TextContent content={content} />;
  }
}

function MindmapContent({ content }: { content: string }) {
  const [editableData, setEditableData] = useState<MindmapData | null>(null);
  const [editingNode, setEditingNode] = useState<{ id: string; label: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [colorPicker, setColorPicker] = useState<number | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  const editInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const requirePremium = () => {
    toast({
      title: t("contentTypes.mindmapPremiumTitle"),
      description: t("contentTypes.mindmapPremiumDesc"),
      variant: "destructive",
    });
  };

  useEffect(() => {
    try { setEditableData(JSON.parse(content)); } catch {}
  }, [content]);

  if (!editableData) {
    try { return <TextContent content={content} />; } catch { return null; }
  }

  const handleNodeClick = (nodeId: string, currentLabel: string) => {
    setColorPicker(null);
    setEditingNode({ id: nodeId, label: currentLabel });
    setEditValue(currentLabel);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleBranchColorClick = (branchIdx: number, _color: string, e: MouseEvent) => {
    e.stopPropagation();
    if (!isPremium) { requirePremium(); return; }
    setEditingNode(null);
    setColorPicker(prev => prev === branchIdx ? null : branchIdx);
  };

  const applyNodeEdit = () => {
    if (!editingNode || !editValue.trim()) { setEditingNode(null); return; }
    const newData = structuredClone(editableData);
    const parts = editingNode.id.split("-");
    if (parts[0] === "central") {
      newData.centralTopic = editValue.trim();
      newData.title = editValue.trim();
    } else if (parts[0] === "branch") {
      newData.branches[+parts[1]].label = editValue.trim();
    } else if (parts[0] === "child") {
      newData.branches[+parts[1]].children![+parts[2]].label = editValue.trim();
    } else if (parts[0] === "detail") {
      newData.branches[+parts[1]].children![+parts[2]].children![+parts[3]].label = editValue.trim();
    }
    setEditableData(newData);
    setEditingNode(null);
  };

  const applyBranchColor = (color: string) => {
    if (colorPicker === null) return;
    const newData = structuredClone(editableData);
    newData.branches[colorPicker].color = color;
    setEditableData(newData);
    setColorPicker(null);
  };

  const addBranch = () => {
    const newData = structuredClone(editableData);
    const idx = newData.branches.length;
    newData.branches.push({
      label: "New Topic",
      color: BRANCH_COLORS[idx % BRANCH_COLORS.length],
      children: [{ label: "Sub-topic", children: [] }],
    });
    setEditableData(newData);
    toast({ title: t("contentTypes.mindmapBranchAdded"), description: t("contentTypes.mindmapBranchAddedDesc") });
  };

  const removeLastBranch = () => {
    if (editableData.branches.length <= 2) return;
    const newData = structuredClone(editableData);
    newData.branches.pop();
    setEditableData(newData);
  };

  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const container = document.getElementById("mindmap-svg-root");
      const svg = container?.querySelector("svg");
      if (!svg) return;
      const viewBox = svg.getAttribute("viewBox") || "0 0 1500 1300";
      const parts = viewBox.split(" ");
      const svgW = parseFloat(parts[2]) || 1500;
      const svgH = parseFloat(parts[3]) || 1300;
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("width", String(svgW));
      clone.setAttribute("height", String(svgH));
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
      const svgStr = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = async () => {
        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = svgW * scale;
        canvas.height = svgH * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, svgW, svgH);
        URL.revokeObjectURL(svgUrl);
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const { jsPDF } = await import("jspdf");
        const isLandscape = svgW > svgH;
        const pdf = new jsPDF({
          orientation: isLandscape ? "landscape" : "portrait",
          unit: "px",
          format: [svgW / scale, svgH / scale],
        });
        pdf.addImage(imgData, "JPEG", 0, 0, svgW / scale, svgH / scale);
        pdf.save(`brightboard-mindmap-${Date.now()}.pdf`);
        setPdfLoading(false);
        toast({ title: t("contentTypes.pdfDownloaded") });
      };
      img.onerror = () => { setPdfLoading(false); toast({ title: t("contentTypes.exportFailed"), variant: "destructive" }); };
      img.src = svgUrl;
    } catch {
      setPdfLoading(false);
      toast({ title: t("contentTypes.exportFailed"), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4" data-testid="mindmap-content" onClick={() => setColorPicker(null)}>
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-bold text-xl" data-testid="mindmap-title">{editableData.title || "Mind Map"}</h3>
        <div className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5" data-testid="logo-badge-mindmap">
          <img src="/favicon.png" alt="BrightBoard" className="w-3.5 h-3.5 rounded" />
          <span className="text-muted-foreground text-[10px] font-medium">brightboardapp.com</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
        <Pencil className="h-3 w-3 shrink-0" />
        <span>
          {t("contentTypes.mindmapEditHint")}{" "}
          {isPremium
            ? t("contentTypes.mindmapColorHint")
            : <span>{t("contentTypes.mindmapPremiumHint")} <a href="/pricing" className="underline text-primary">Premium</a>.</span>
          }
        </span>
      </div>

      <div className="rounded-xl border overflow-hidden shadow-sm relative" onClick={e => e.stopPropagation()}>
        <MindmapCanvas
          data={editableData}
          onNodeClick={handleNodeClick}
          onBranchColorClick={handleBranchColorClick}
          editable={true}
        />
      </div>

      {colorPicker !== null && (
        <div className="border rounded-xl p-3 bg-background shadow-md" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold flex items-center gap-1.5"><Palette className="h-3.5 w-3.5" /> {t("contentTypes.mindmapBranchColor")}</p>
            <button onClick={() => setColorPicker(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {BRANCH_COLORS.map(c => (
              <button
                key={c}
                data-testid={`color-swatch-${c}`}
                className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1"
                style={{ background: c, borderColor: editableData.branches[colorPicker]?.color === c ? "#1f2937" : "transparent" }}
                onClick={() => applyBranchColor(c)}
              />
            ))}
          </div>
        </div>
      )}

      {editingNode && (
        <div className="border rounded-xl p-3 bg-background shadow-md">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold flex items-center gap-1.5"><Pencil className="h-3.5 w-3.5" /> {t("contentTypes.mindmapEditLabel")}</p>
            <button onClick={() => setEditingNode(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex gap-2">
            <input
              ref={editInputRef}
              data-testid="input-mindmap-edit"
              className="flex-1 border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") applyNodeEdit(); if (e.key === "Escape") setEditingNode(null); }}
              placeholder={t("contentTypes.mindmapEnterLabel")}
            />
            <Button size="sm" onClick={applyNodeEdit} data-testid="button-mindmap-save-edit">{t("common.save")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingNode(null)}>{t("common.cancel")}</Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={isPremium ? addBranch : requirePremium}
          data-testid="button-mindmap-add-branch"
          title={isPremium ? t("contentTypes.mindmapAddBranchTooltip") : t("contentTypes.mindmapPremiumBranchTooltip")}
        >
          {isPremium ? <Plus className="h-4 w-4 mr-1.5" /> : <Crown className="h-4 w-4 mr-1.5 text-yellow-500" />}
          {t("contentTypes.mindmapAddBranch")}
        </Button>
        {editableData.branches.length > 2 && (
          <Button
            size="sm"
            variant="outline"
            onClick={isPremium ? removeLastBranch : requirePremium}
            data-testid="button-mindmap-remove-branch"
          >
            <X className="h-4 w-4 mr-1.5" />
            {t("contentTypes.mindmapRemoveBranch")}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={isPremium ? downloadPDF : requirePremium}
          disabled={pdfLoading}
          data-testid="button-mindmap-download-pdf"
          title={isPremium ? t("contentTypes.mindmapDownloadPdfTooltip") : t("contentTypes.mindmapPremiumPdfTooltip")}
        >
          {pdfLoading ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : isPremium ? (
            <FileText className="h-4 w-4 mr-1.5" />
          ) : (
            <Crown className="h-4 w-4 mr-1.5 text-yellow-500" />
          )}
          {t("contentTypes.mindmapDownloadPdf")}
        </Button>
      </div>
      {!isPremium && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Crown className="h-3 w-3 text-yellow-500" />
          <span>{t("contentTypes.mindmapPremiumNote")} <a href="/pricing" className="underline text-primary">{t("contentTypes.mindmapUpgradeHere")}</a></span>
        </p>
      )}
    </div>
  );
}
