"use strict";

// server/workers/pdfExtractWorker.ts
var import_node_worker_threads = require("node:worker_threads");
var import_pdf = require("pdf.js-extract");

// server/pdf-reference-text.ts
function collectPdfReferenceText(pages, maxChars) {
  if (!Number.isInteger(maxChars) || maxChars < 1) throw new Error("A positive text limit is required.");
  const chunks = [];
  let outputLength = 0, emptyPages = 0, truncated = false;
  for (const page of pages) {
    if (!Array.isArray(page?.content)) throw new Error("Invalid PDF page content.");
    let pageHasText = false;
    for (const item of page.content) {
      if (item?.str !== void 0 && typeof item.str !== "string") throw new Error("Invalid PDF text.");
      const normalized = (item?.str ?? "").replace(/\s+/g, " ").trim();
      if (!normalized) continue;
      const separator = pageHasText ? " " : outputLength > 0 ? "\n\n" : "";
      pageHasText = true;
      if (truncated) continue;
      const piece = separator + normalized;
      const remaining = maxChars - outputLength;
      if (piece.length <= remaining) {
        chunks.push(piece);
        outputLength += piece.length;
      } else {
        if (remaining > 0) chunks.push(piece.slice(0, remaining));
        outputLength += Math.max(0, remaining);
        truncated = true;
      }
    }
    if (!pageHasText) emptyPages++;
  }
  return {
    text: chunks.join("").trimEnd(),
    pages: pages.length,
    examinedPages: pages.length,
    emptyPages,
    statsComplete: true,
    truncated
  };
}

// server/workers/pdfExtractWorker.ts
async function run() {
  if (!import_node_worker_threads.parentPort) return;
  try {
    const { buffer, maxPages, maxChars } = import_node_worker_threads.workerData;
    if (!(buffer instanceof Uint8Array) || !Number.isInteger(maxPages) || maxPages < 1 || !Number.isInteger(maxChars) || maxChars < 1) throw new Error("Invalid worker input.");
    const result = await new import_pdf.PDFExtract().extractBuffer(Buffer.from(buffer), { firstPage: 1, lastPage: maxPages + 1 });
    if (!Array.isArray(result.pages)) throw new Error("Invalid parser result.");
    if (result.pages.length > maxPages) {
      import_node_worker_threads.parentPort.postMessage({ ok: false, code: "TOO_MANY_PAGES" });
      return;
    }
    const text = collectPdfReferenceText(result.pages, maxChars);
    import_node_worker_threads.parentPort.postMessage(text.text.trim() ? { ok: true, ...text } : { ok: false, code: "NO_EMBEDDED_TEXT", pages: text.pages });
  } catch {
    import_node_worker_threads.parentPort.postMessage({ ok: false, code: "PDF_PARSE_FAILED" });
  }
}
void run();
