import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PPTX_MIME, validateInput, type ToolOutput } from "./file-tool-operations";

export type FileTaskOptions = { marked?: boolean; signal?: AbortSignal; onProgress?: (message: string) => void };
function check(options: FileTaskOptions, message?: string) {
  options.signal?.throwIfAborted();
  if (message) options.onProgress?.(message);
}
function output(blob: Blob, name: string): ToolOutput {
  if (blob.size > 40 * 1024 * 1024) throw new Error("Output exceeds 40 MB. Use fewer pages or smaller files.");
  return { blob, name };
}
async function mark(pdf: PDFDocument, enabled: boolean) {
  if (!enabled || !pdf.getPageCount()) return;
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.getPage(0).drawText("brightboardapp.com", { x: 16, y: 12, size: 9, font, color: rgb(.5, .5, .5) });
}
async function loadPdf(file: File) {
  try { return await PDFDocument.load(await file.arrayBuffer()); }
  catch { throw new Error(`${file.name} cannot be opened. It may be damaged or password-protected. No partial result was created.`); }
}
export async function mergeFilesLocally(files: File[], options: FileTaskOptions = {}): Promise<ToolOutput> {
  if (files.length < 2 || files.length > 10) throw new Error("Select between 2 and 10 files.");
  if (files.reduce((sum, file) => sum + file.size, 0) > 30 * 1024 * 1024) throw new Error("Use at most 30 MB of files in one merge.");
  const pdf = await PDFDocument.create();
  for (const [index, file] of Array.from(files.entries())) {
    validateInput(file);
    check(options, `Merging file ${index + 1} of ${files.length}: ${file.name}…`);
    if (/\.pdf$/i.test(file.name)) {
      const source = await loadPdf(file);
      if (source.getPageCount() + pdf.getPageCount() > 200) throw new Error("Merged output must not exceed 200 pages. No pages were dropped.");
      for (const page of await pdf.copyPages(source, source.getPageIndices())) pdf.addPage(page);
    } else if (/\.(png|jpe?g)$/i.test(file.name)) {
      if (pdf.getPageCount() >= 200) throw new Error("Merged output must not exceed 200 pages.");
      const bytes = await file.arrayBuffer();
      let image;
      try { image = /\.png$/i.test(file.name) ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes); }
      catch { throw new Error(`${file.name} is not a readable PNG or JPEG image. No partial merge was created.`); }
      const page = pdf.addPage([595, 842]);
      const scale = Math.min(535 / image.width, 782 / image.height);
      page.drawImage(image, { x: (595 - image.width * scale) / 2, y: (842 - image.height * scale) / 2, width: image.width * scale, height: image.height * scale });
    } else throw new Error("Merge accepts PDF, PNG and JPEG files.");
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  check(options, "Saving merged PDF on this device…");
  await mark(pdf, options.marked !== false);
  const bytes = await pdf.save({ useObjectStreams: true });
  check(options);
  return output(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), "merged-document.pdf");
}
async function imageCanvas(file: File, whiteBackground: boolean) {
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 32_000_000 || bitmap.width > 16384 || bitmap.height > 16384) throw new Error("This image is too large to process safely. Use an image under 32 megapixels and 16,384 pixels per side.");
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser cannot process this image.");
    if (whiteBackground) { context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); }
    context.drawImage(bitmap, 0, 0);
    return { canvas, context };
  } finally { bitmap.close(); }
}
function canvasBlob(canvas: HTMLCanvasElement, type: string, quality = .92) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image export failed.")), type, quality));
}
function markImage(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, enabled: boolean) {
  if (!enabled) return;
  const size = Math.max(12, canvas.width / 65);
  context.font = `${size}px sans-serif`;
  context.fillStyle = "rgba(255,255,255,.85)";
  context.fillRect(8, canvas.height - size * 2, Math.min(canvas.width - 16, size * 12), size * 1.7);
  context.fillStyle = "#777";
  context.fillText("brightboardapp.com", 12, canvas.height - size / 2);
}
export async function convertImageLocally(file: File, target: string, options: FileTaskOptions = {}): Promise<ToolOutput> {
  validateInput(file);
  if (!/\.(png|jpe?g)$/i.test(file.name)) throw new Error("Choose a PNG or JPEG image.");
  check(options, "Reading image on this device…");
  const { canvas, context } = await imageCanvas(file, ["jpg", "jpeg", "pptx"].includes(target));
  const name = file.name.replace(/\.[^.]+$/, "").slice(0, 100);
  try {
    check(options, "Converting image on this device…");
    if (["jpg", "jpeg", "png"].includes(target)) {
      markImage(context, canvas, options.marked !== false);
      const mime = target === "png" ? "image/png" : "image/jpeg";
      const blob = await canvasBlob(canvas, mime);
      check(options);
      return output(blob, `${name}.${target === "jpeg" ? "jpg" : target}`);
    }
    if (target === "pdf") {
      const pdf = await PDFDocument.create();
      const image = await pdf.embedPng(await (await canvasBlob(canvas, "image/png")).arrayBuffer());
      const page = pdf.addPage([595, 842]);
      const scale = Math.min(535 / image.width, 782 / image.height);
      page.drawImage(image, { x: (595 - image.width * scale) / 2, y: (842 - image.height * scale) / 2, width: image.width * scale, height: image.height * scale });
      await mark(pdf, options.marked !== false);
      const bytes = await pdf.save();
      check(options);
      return output(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), `${name}.pdf`);
    }
    if (target === "pptx") {
      const { default: PptxGenJS } = await import("pptxgenjs");
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE"; pptx.author = "BrightBoard"; pptx.title = name;
      const data = canvas.toDataURL("image/jpeg", .92);
      const slide = pptx.addSlide();
      const scale = Math.min(12.3 / canvas.width, 6.5 / canvas.height);
      const w = canvas.width * scale, h = canvas.height * scale;
      slide.addImage({ data, x: (13.333 - w) / 2, y: (7.5 - h) / 2, w, h });
      if (options.marked !== false) slide.addText("brightboardapp.com", { x: .3, y: 7.15, w: 5, h: .2, fontSize: 10, color: "777777" });
      const blob = await pptx.write({ outputType: "blob" }) as Blob;
      check(options);
      return output(new Blob([blob], { type: PPTX_MIME }), `${name}.pptx`);
    }
    throw new Error("Choose PDF, PNG, JPEG or PowerPoint as the target.");
  } finally { canvas.width = canvas.height = 0; }
}
export async function compressFileLocally(file: File, level: string, options: FileTaskOptions = {}): Promise<ToolOutput> {
  validateInput(file);
  check(options, "Optimizing file on this device…");
  if (/\.pdf$/i.test(file.name)) {
    const pdf = await loadPdf(file);
    await mark(pdf, options.marked !== false);
    check(options, "Saving optimized PDF…");
    const bytes = await pdf.save({ useObjectStreams: true });
    check(options);
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
    return output(blob.size >= file.size && options.marked === false ? new Blob([file], { type: "application/pdf" }) : blob, `compressed-${file.name}`);
  }
  if (!/\.(png|jpe?g)$/i.test(file.name)) throw new Error("Compression accepts PDF, PNG or JPEG files.");
  const png = /\.png$/i.test(file.name);
  const { canvas, context } = await imageCanvas(file, !png);
  try {
    markImage(context, canvas, options.marked !== false);
    const quality = level === "high" ? .4 : level === "low" ? .9 : .7;
    const blob = await canvasBlob(canvas, png ? "image/png" : "image/jpeg", quality);
    check(options);
    return output(blob, `compressed-${file.name}`);
  } finally { canvas.width = canvas.height = 0; }
}
