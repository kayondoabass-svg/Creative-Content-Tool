import type { Express } from "express";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { worksheetLines } from "../shared/worksheet-quality";
import rateLimit from "express-rate-limit";

const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));
export function worksheetPages(data: any): string[] {
  const lines = worksheetLines(data).flatMap(line => {
    const result: string[] = [];
    let current = "";
    for (const word of line.split(/\s+/)) {
      if ((current + " " + word).length > 76 && current) { result.push(current); current = ""; }
      current += (current ? " " : "") + word;
    }
    return [...result, current];
  });
  const pages: string[] = [];
  for (let start = 0; start < lines.length; start += 38) {
    const body = lines.slice(start, start + 38).map((line, i) => `<text xml:space="preserve" x="50" y="${70 + i * 27}" font-size="${start + i === 0 ? 23 : 16}" font-family="${data.layout === "wordSearch" ? "DejaVu Sans Mono, monospace" : "DejaVu Sans, sans-serif"}">${escape(line)}</text>`).join("");
    pages.push(`<svg xmlns="http://www.w3.org/2000/svg" width="850" height="1200"><rect width="100%" height="100%" fill="white"/><g fill="#153f42">${body}<text x="50" y="1160" font-family="sans-serif" font-size="12">BrightBoard · Student worksheet · Page ${pages.length + 1}</text></g></svg>`);
  }
  const illustrated = [...(data.questions || []), ...(data.sections || [])]
    .map((item: any, i: number) => ({ item, number: i + 1 }))
    .filter(({ item }) => typeof item.imageUrl === "string" && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(item.imageUrl));
  for (let start = 0; start < illustrated.length; start += 3) {
    const body = illustrated.slice(start, start + 3).map(({ item, number }, i) => `<text x="50" y="${100 + i * 330}" font-family="sans-serif" font-size="16">Exercise / section ${number}</text><image href="${item.imageUrl}" x="50" y="${120 + i * 330}" width="750" height="270" preserveAspectRatio="xMidYMid meet"/>`).join("");
    pages.push(`<svg xmlns="http://www.w3.org/2000/svg" width="850" height="1200"><rect width="100%" height="100%" fill="white"/><text x="50" y="55" font-family="sans-serif" font-size="23">Worksheet illustrations</text>${body}<text x="50" y="1160" font-family="sans-serif" font-size="12">BrightBoard · Student worksheet · Page ${pages.length + 1}</text></svg>`);
  }
  return pages;
}

export function registerWorksheetExport(app: Express) {
  app.post("/api/worksheets/export", rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false }), async (req, res) => {
    try {
      if (typeof req.body.content !== "string" || req.body.content.length > 16 * 1024 * 1024) return res.status(413).json({ error: "Worksheet export is limited to 16 MB." });
      const data = JSON.parse(req.body.content);
      const pages = worksheetPages(data);
      if (pages.length > 25) return res.status(413).json({ error: "Export is limited to 25 pages." });
      const name = String(data.title).replace(new RegExp("[^\\p{L}\\p{N} _-]", "gu"), "").slice(0, 70) || "worksheet";
      if (req.body.format === "jpeg") {
        const files = await Promise.all(pages.map(async (svg, i) => ({ file: `data:image/jpeg;base64,${(await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer()).toString("base64")}`, fileName: `${name}-${i + 1}.jpg` })));
        return res.json({ files });
      }
      const pdf = await PDFDocument.create();
      for (const svg of pages) {
        const image = await pdf.embedPng(await sharp(Buffer.from(svg)).png().toBuffer());
        pdf.addPage([595, 842]).drawImage(image, { x: 0, y: 0, width: 595, height: 842 });
      }
      res.json({ file: `data:application/pdf;base64,${Buffer.from(await pdf.save()).toString("base64")}`, fileName: `${name}.pdf` });
    } catch {
      res.status(400).json({ error: "This worksheet could not be exported. Its exercise data is incomplete; your original content has not been changed." });
    }
  });
}
