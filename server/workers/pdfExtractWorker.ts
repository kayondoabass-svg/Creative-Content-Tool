import { parentPort, workerData } from "node:worker_threads";
import { PDFExtract } from "pdf.js-extract";
import { collectPdfReferenceText } from "../pdf-reference-text";

async function run() {
  if (!parentPort) return;
  try {
    const { buffer, maxPages, maxChars } = workerData;
    if (!(buffer instanceof Uint8Array) || !Number.isInteger(maxPages) || maxPages < 1 ||
        !Number.isInteger(maxChars) || maxChars < 1) throw new Error("Invalid worker input.");
    const result = await new PDFExtract().extractBuffer(Buffer.from(buffer), { firstPage: 1, lastPage: maxPages + 1 });
    if (!Array.isArray(result.pages)) throw new Error("Invalid parser result.");
    if (result.pages.length > maxPages) {
      parentPort.postMessage({ ok: false, code: "TOO_MANY_PAGES" });
      return;
    }
    const text = collectPdfReferenceText(result.pages, maxChars);
    parentPort.postMessage(text.text.trim()
      ? { ok: true, ...text }
      : { ok: false, code: "NO_EMBEDDED_TEXT", pages: text.pages });
  } catch {
    parentPort.postMessage({ ok: false, code: "PDF_PARSE_FAILED" });
  }
}
void run();
