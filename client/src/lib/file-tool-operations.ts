import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import JSZip from "jszip";

export type ToolOutput = { blob: Blob; name: string };
export type FileOperationControl = { signal?: AbortSignal; onProgress?: (message: string) => void };
const MAX_INPUT = 20 * 1024 * 1024;
const MAX_OUTPUT = 40 * 1024 * 1024;
export const WORD_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export function validateInput(file: Pick<File, "size" | "name">) {
  if (!file.size) throw new Error("This file is empty.");
  if (file.size > MAX_INPUT) throw new Error("Choose a file under 20 MB.");
  if (/\.doc$/i.test(file.name)) throw new Error("Older .doc files must first be saved as .docx in Word or LibreOffice.");
}
export function parsePageRanges(value: string, count: number): number[] {
  const pages = new Set<number>();
  if (!value.trim()) throw new Error("Enter pages such as 1-3,5.");
  for (const part of value.split(",")) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error("Use page numbers or ranges, for example 1-3,5.");
    const start = Number(match[1]), end = Number(match[2] || start);
    if (start < 1 || end < start || end > count) throw new Error(`Pages must be between 1 and ${count}.`);
    if (end - start > 100) throw new Error("Select at most 100 pages.");
    for (let p = start; p <= end; p++) pages.add(p - 1);
    if (pages.size > 100) throw new Error("Select at most 100 pages.");
  }
  return Array.from(pages).sort((a, b) => a - b);
}
function bounded(blob: Blob) {
  if (blob.size > MAX_OUTPUT) throw new Error("Output exceeds 40 MB. Select fewer pages or a smaller file.");
  return blob;
}
function stem(name: string) { return name.replace(/\.[^.]+$/, "").replace(/[\\/]/g, "-").slice(0, 100); }
async function loadPdf(bytes: ArrayBuffer) {
  try { return await PDFDocument.load(bytes); }
  catch { throw new Error("This PDF could not be opened. It may be damaged or password-protected."); }
}
async function watermark(pdf: PDFDocument, enabled: boolean) {
  if (!enabled) return;
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const page of pdf.getPages()) page.drawText("brightboardapp.com", { x: 16, y: 12, size: 9, font, color: rgb(.5, .5, .5) });
}
export async function splitPdf(file: File, ranges: string, separate: boolean, marked = true, control: FileOperationControl = {}): Promise<ToolOutput[]> {
  validateInput(file);
  control.signal?.throwIfAborted();
  const source = await loadPdf(await file.arrayBuffer());
  const pages = parsePageRanges(ranges, source.getPageCount());
  const groups = separate ? pages.map(p => [p]) : [pages];
  const results: ToolOutput[] = [];
  let size = 0;
  for (const group of groups) {
    control.signal?.throwIfAborted();
    control.onProgress?.(`Extracting ${separate ? `page ${group[0] + 1}` : `${group.length} selected pages`}…`);
    const pdf = await PDFDocument.create();
    for (const page of await pdf.copyPages(source, group)) pdf.addPage(page);
    await watermark(pdf, marked);
    const blob = bounded(new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" }));
    size += blob.size;
    if (size > MAX_OUTPUT) throw new Error("Combined output exceeds 40 MB. Select fewer pages.");
    results.push({ blob, name: separate ? `${stem(file.name)}-page-${group[0] + 1}.pdf` : `${stem(file.name)}-selected-pages.pdf` });
  }
  return results;
}
export async function extractWordText(bytes: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const entries = Object.values(zip.files);
  const expanded = entries.reduce((sum, entry: any) => sum + (entry._data?.uncompressedSize || 0), 0);
  if (entries.length > 5000 || expanded > 100 * 1024 * 1024) throw new Error("This Word document is too complex to process safely.");
  if (!zip.file("word/document.xml")) throw new Error("This is not a valid DOCX document. Save it as .docx in Word first.");
  const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.extractRawText({ arrayBuffer: bytes });
  const text = result.value.trim();
  if (!text) throw new Error("This document contains no readable text. Scanned or image-only documents need OCR.");
  if (text.length > 150000) throw new Error("This document exceeds the 150,000-character text limit.");
  return text;
}
export function paginateText(text: string, maxChars = 900): string[] {
  const pages: string[] = [];
  let current = "";
  for (const token of text.match(/\S+\s*/g) || []) {
    for (let offset = 0; offset < token.length; offset += maxChars) {
      const chunk = token.slice(offset, offset + maxChars);
      if (current.length + chunk.length > maxChars && current) { pages.push(current.trim()); current = ""; }
      current += chunk;
    }
  }
  if (current.trim()) pages.push(current.trim());
  return pages;
}
export async function textToPresentation(text: string, name: string, marked = true): Promise<ToolOutput> {
  if (!text.trim()) throw new Error("Enter some text first.");
  if (text.length > 150000) throw new Error("Use at most 150,000 characters.");
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; pptx.author = "BrightBoard"; pptx.title = stem(name);
  for (const [index, section] of Array.from(paginateText(text).entries())) {
    const slide = pptx.addSlide();
    slide.addText(`${stem(name)} · ${index + 1}`, { x: .6, y: .3, w: 12, h: .55, fontSize: 24, bold: true, color: "227570" });
    slide.addText(section, { x: .6, y: 1.15, w: 12, h: 5.6, fontSize: 20, breakLine: false, fit: "shrink", valign: "top" });
    if (marked) slide.addText("brightboardapp.com", { x: .6, y: 7, w: 5, h: .2, fontSize: 10, color: "777777" });
  }
  return { blob: bounded(await pptx.write({ outputType: "blob" }) as Blob), name: `${stem(name)}.pptx` };
}
export async function textToWord(text: string, name: string, marked = true): Promise<ToolOutput> {
  if (!text.trim()) throw new Error("No readable text was found.");
  if (text.length > 150000) throw new Error("Use at most 150,000 characters.");
  const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  const paragraphs = text.split(/\r?\n/).map(line => `<w:p><w:r><w:t xml:space="preserve">${escape(line)}</w:t></w:r></w:p>`).join("");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}${marked ? "<w:p><w:r><w:t>brightboardapp.com</w:t></w:r></w:p>" : ""}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`);
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return { blob: bounded(new Blob([new Uint8Array(bytes)], { type: WORD_MIME })), name: `${stem(name)}.docx` };
}
export async function pdfToWord(file: File, marked = true, control: FileOperationControl = {}): Promise<ToolOutput> {
  validateInput(file);
  control.signal?.throwIfAborted();
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const stop = () => { void task.destroy().catch(() => {}); };
  control.signal?.addEventListener("abort", stop, { once: true });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 100) throw new Error("Use a PDF with at most 100 pages, or split it first.");
    let text = "";
    for (let p = 1; p <= pdf.numPages; p++) {
      control.signal?.throwIfAborted();
      control.onProgress?.(`Reading text on page ${p} of ${pdf.numPages}…`);
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join("").trim();
      if (!pageText) throw new Error(`Page ${p} has no readable text. Scanned pages need OCR; no incomplete Word document was created.`);
      text += pageText + "\n\n";
      if (text.length > 150000) throw new Error("This PDF exceeds the 150,000-character text limit.");
      page.cleanup();
    }
    return textToWord(text, file.name, marked);
  } finally { control.signal?.removeEventListener("abort", stop); await task.destroy(); }
}
async function wordTextPdf(text: string, name: string, marked: boolean): Promise<ToolOutput> {
  // Browser fonts render Unicode; raster pages avoid silently dropping non-Latin text.
  const { jsPDF } = await import("jspdf");
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1240; canvas.height = 1754;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser cannot render this document.");
  const lines: string[] = [];
  ctx.font = "26px sans-serif";
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const char of Array.from(paragraph)) {
      if (ctx.measureText(line + char).width > 1080 && line) { lines.push(line); line = ""; }
      line += char;
    }
    lines.push(line);
  }
  const pageCount = Math.ceil(lines.length / 44);
  if (pageCount > 100) throw new Error("This conversion exceeds 100 pages.");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  for (let p = 0; p < pageCount; p++) {
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#172d32";
    lines.slice(p * 44, (p + 1) * 44).forEach((line, i) => ctx.fillText(line, 80, 100 + i * 35));
    if (marked) { ctx.font = "18px sans-serif"; ctx.fillText("brightboardapp.com", 80, 1715); ctx.font = "26px sans-serif"; }
    if (p) pdf.addPage();
    pdf.addImage(canvas.toDataURL("image/jpeg", .9), "JPEG", 0, 0, 595.28, 841.89);
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  canvas.width = canvas.height = 0;
  return { blob: bounded(pdf.output("blob")), name: `${stem(name)}.pdf` };
}
export async function convertWord(file: File, target: string, marked = true, control: FileOperationControl = {}): Promise<ToolOutput> {
  validateInput(file);
  control.signal?.throwIfAborted();
  control.onProgress?.("Reading Word text on this device…");
  const text = await extractWordText(await file.arrayBuffer());
  control.signal?.throwIfAborted();
  control.onProgress?.("Building Word conversion…");
  if (target === "pdf") return wordTextPdf(text, file.name, marked);
  if (target === "pptx") return textToPresentation(text, file.name, marked);
  throw new Error("Choose PDF or PowerPoint for a Word document.");
}
export async function pdfToImages(file: File, format: "png" | "jpeg", marked = true, control: FileOperationControl = {}): Promise<ToolOutput[]> {
  validateInput(file);
  control.signal?.throwIfAborted();
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const stop = () => { void task.destroy().catch(() => {}); };
  control.signal?.addEventListener("abort", stop, { once: true });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 100) throw new Error("Use a PDF with at most 100 pages, or split it first.");
    const outputs: ToolOutput[] = [];
    let total = 0;
    for (let p = 1; p <= pdf.numPages; p++) {
      control.signal?.throwIfAborted();
      control.onProgress?.(`Rendering image ${p} of ${pdf.numPages}…`);
      const page = await pdf.getPage(p);
      const original = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(2, 2400 / Math.max(original.width, original.height)) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser cannot render PDF images.");
      await page.render({ canvas, canvasContext: context, viewport, background: "white" }).promise;
      if (marked) { context.font = `${Math.max(12, canvas.width / 65)}px sans-serif`; context.fillStyle = "#777"; context.fillText("brightboardapp.com", 16, canvas.height - 16); }
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Image export failed.")), `image/${format}`, .92));
      total += blob.size;
      if (total > MAX_OUTPUT) throw new Error("Output exceeds 40 MB. Split this PDF into smaller sections.");
      outputs.push({ blob, name: `${stem(file.name)}-page-${p}.${format === "jpeg" ? "jpg" : "png"}` });
      page.cleanup(); canvas.width = canvas.height = 0;
    }
    return outputs;
  } finally { control.signal?.removeEventListener("abort", stop); await task.destroy(); }
}
export async function bundleOutputs(outputs: ToolOutput[]): Promise<ToolOutput> {
  const zip = new JSZip();
  for (const output of outputs) zip.file(output.name, await output.blob.arrayBuffer());
  return { blob: bounded(await zip.generateAsync({ type: "blob", compression: "STORE" })), name: "brightboard-files.zip" };
}
