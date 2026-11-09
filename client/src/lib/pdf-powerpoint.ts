import { PPTX_MIME, paginateText, validateInput, type ToolOutput } from "./file-tool-operations";

export type PdfPowerPointOptions = {
  mode?: "pages" | "text";
  marked?: boolean;
  signal?: AbortSignal;
  onProgress?: (message: string) => void;
};

/** Reject promptly even if a worker or packaging promise never settles. */
export function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const fail = () => reject(signal.reason instanceof Error ? signal.reason : new Error("Conversion cancelled."));
    if (signal.aborted) { void promise.catch(() => {}); fail(); return; }
    signal.addEventListener("abort", fail, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", fail));
  });
}

/**
 * Local, sequential conversion. Page images preserve illustrations/scans;
 * text mode remains available but is explicitly not a faithful layout export.
 */
export async function pdfToPowerPoint(file: File, options: PdfPowerPointOptions = {}): Promise<ToolOutput> {
  validateInput(file);
  const controller = new AbortController();
  const cancel = () => controller.abort(new Error("Conversion cancelled. Your original file and previous results are unchanged."));
  if (options.signal?.aborted) cancel();
  else options.signal?.addEventListener("abort", cancel, { once: true });
  const deadline = setTimeout(() => controller.abort(new Error("Conversion exceeded 3 minutes. Split the PDF into smaller sections and retry.")), 180000);
  const { signal } = controller;
  let task: any;
  let render: any;
  const stopWorker = () => {
    render?.cancel();
    if (task) void task.destroy().catch(() => {});
  };
  signal.addEventListener("abort", stopWorker, { once: true });
  const wait = <T>(promise: Promise<T>) => abortable(promise, signal);
  const progress = (message: string) => { signal.throwIfAborted(); options.onProgress?.(message); };
  try {
    progress("Reading PDF on this device…");
    const [pdfjs, worker, pptxModule] = await wait(Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
      import("pptxgenjs"),
    ]));
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const bytes = await wait(file.arrayBuffer());
    task = pdfjs.getDocument({ data: new Uint8Array(bytes) });
    const pdf = await wait(task.promise) as import("pdfjs-dist").PDFDocumentProxy;
    if (pdf.numPages > 100) throw new Error("Use at most 100 PDF pages. Split the PDF first; no pages have been silently dropped.");
    const pptx = new pptxModule.default();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "BrightBoard";
    const title = file.name.replace(/\.pdf$/i, "").slice(0, 100);
    pptx.title = title;
    let imageBytes = 0;
    let textCharacters = 0;
    for (let number = 1; number <= pdf.numPages; number++) {
      progress(`Converting page ${number} of ${pdf.numPages}…`);
      const page = await wait(pdf.getPage(number));
      try {
        if (options.mode === "text") {
          const content = await wait(page.getTextContent());
          const text = content.items.map(item => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join("").trim();
          if (!text) throw new Error(`Page ${number} has no readable text. Choose “Keep page appearance” to include scanned or illustrated pages.`);
          if (text.length > 30000) throw new Error(`Page ${number} contains too much text. Choose “Keep page appearance” instead.`);
          textCharacters += text.length;
          if (textCharacters > 150000) throw new Error("This PDF contains too much text for one presentation. Split it or choose “Keep page appearance”.");
          for (const [index, chunk] of Array.from(paginateText(text).entries())) {
            const slide = pptx.addSlide();
            slide.addText(`${title} · page ${number}${index ? ` (continued ${index + 1})` : ""}`, { x: .5, y: .25, w: 12.3, h: .6, fontSize: 22, bold: true });
            slide.addText(chunk, { x: .5, y: 1, w: 12.3, h: 5.8, fontSize: 20, fit: "shrink", valign: "top" });
            if (options.marked !== false) slide.addText("brightboardapp.com", { x: .4, y: 7.1, w: 6, h: .2, fontSize: 10, color: "777777" });
          }
        } else {
          const original = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: Math.min(2, 2000 / Math.max(original.width, original.height)) });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
          try {
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Your browser cannot render this PDF.");
            render = page.render({ canvas, canvasContext: context, viewport, background: "white" });
            await wait(render.promise);
            render = undefined;
            const data = canvas.toDataURL("image/jpeg", .85);
            imageBytes += Math.ceil(data.length * .75);
            if (imageBytes > 40 * 1024 * 1024) throw new Error("Rendered pages exceed 40 MB. Split this PDF and convert smaller sections.");
            const slide = pptx.addSlide();
            const width = 13.333333, height = 7.5;
            const scale = Math.min(width / canvas.width, height / canvas.height);
            const w = canvas.width * scale, h = canvas.height * scale;
            slide.addImage({ data, x: (width - w) / 2, y: (height - h) / 2, w, h });
            if (options.marked !== false) slide.addText("brightboardapp.com", { x: .2, y: 7.15, w: 5, h: .2, fontSize: 10, color: "777777", fill: { color: "FFFFFF", transparency: 15 } });
          } finally { canvas.width = canvas.height = 0; }
        }
      } finally { page.cleanup(); }
      await wait(new Promise(resolve => setTimeout(resolve, 0)));
    }
    progress("Building PowerPoint download…");
    const result = await wait(pptx.write({ outputType: "blob" })) as Blob;
    if (result.size > 40 * 1024 * 1024) throw new Error("PowerPoint exceeds 40 MB. Split the PDF into smaller sections.");
    return { blob: new Blob([result], { type: PPTX_MIME }), name: `${title}.pptx` };
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    throw error;
  } finally {
    clearTimeout(deadline);
    options.signal?.removeEventListener("abort", cancel);
    signal.removeEventListener("abort", stopWorker);
    if (task) void task.destroy().catch(() => {});
  }
}
