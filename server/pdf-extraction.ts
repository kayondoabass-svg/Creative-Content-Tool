import express, { type Express, type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { Worker } from "node:worker_threads";
import path from "node:path";
import type { collectPdfReferenceText } from "./pdf-reference-text";

export const PDF_REFERENCE_LIMITS = {
  bytes: 15 * 1024 * 1024, pages: 150, chars: 12_000, timeout: 15_000,
};
const MAX_ENCODED = Math.ceil(PDF_REFERENCE_LIMITS.bytes / 3) * 4;
const BODY_LIMIT = MAX_ENCODED + 4096;
type WorkerResult = ({ ok: true } & ReturnType<typeof collectPdfReferenceText>) |
  { ok: false; code: string; pages?: number };

export async function runPdfWorker(
  buffer: Buffer, signal: AbortSignal, timeout = PDF_REFERENCE_LIMITS.timeout,
  workerFile?: string,
): Promise<WorkerResult> {
  if (signal.aborted) throw new Error("CLIENT_DISCONNECTED");
  const production = process.env.NODE_ENV === "production";
  // Explicit dev bootstrap avoids relying on inherited TS loaders in worker threads.
  const worker = workerFile || production
    ? new Worker(workerFile || path.resolve("dist/pdfExtractWorker.cjs"), {
        workerData: { buffer, maxPages: PDF_REFERENCE_LIMITS.pages, maxChars: PDF_REFERENCE_LIMITS.chars },
        resourceLimits: { maxOldGenerationSizeMb: 192, maxYoungGenerationSizeMb: 32 },
        execArgv: [],
      })
    : new Worker(
        `require("tsx/cjs"); require(require("node:worker_threads").workerData.entry);`,
        {
          eval: true, execArgv: [],
          workerData: {
            entry: path.resolve("server/workers/pdfExtractWorker.ts"),
            buffer, maxPages: PDF_REFERENCE_LIMITS.pages, maxChars: PDF_REFERENCE_LIMITS.chars,
          },
          resourceLimits: { maxOldGenerationSizeMb: 192, maxYoungGenerationSizeMb: 32 },
        },
      );
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  try {
    return await new Promise<WorkerResult>((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (abort) signal.removeEventListener("abort", abort);
        fn();
      };
      abort = () => finish(() => reject(new Error("CLIENT_DISCONNECTED")));
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) return abort();
      timer = setTimeout(() => finish(() => reject(new Error("PDF_EXTRACT_TIMEOUT"))), timeout);
      worker.once("message", value => finish(() => resolve(value)));
      worker.once("error", () => finish(() => reject(new Error("PDF_WORKER_FAILED"))));
      worker.once("exit", () => finish(() => reject(new Error("PDF_WORKER_NO_RESULT"))));
    });
  } finally {
    clearTimeout(timer);
    if (abort) signal.removeEventListener("abort", abort);
    await worker.terminate();
  }
}

export function registerPdfExtraction(
  app: Express, authenticate: RequestHandler,
  extract: typeof runPdfWorker = runPdfWorker,
) {
  // One admitted upload/extraction per process, including body buffering.
  let busy = false;
  const parser = express.json({ limit: BODY_LIMIT, inflate: false });
  const limiter = rateLimit({
    windowMs: 60_000, limit: 6, standardHeaders: true, legacyHeaders: false,
    message: { error: "Please wait before reading another PDF.", code: "PDF_RATE_LIMIT" },
  });
  app.post("/api/extract-pdf-text",
    (_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); next(); },
    authenticate, limiter,
    (req, res) => {
      if (busy) {
        res.setHeader("Retry-After", "5");
        res.status(429).json({ error: "Another document is being read. Please retry shortly.", code: "EXTRACTION_BUSY" });
        return;
      }
      busy = true;
      const controller = new AbortController();
      let extracting = false, released = false;
      const release = () => {
        if (extracting || released) return;
        released = true;
        busy = false;
        clearTimeout(uploadTimer);
        req.off("aborted", disconnect);
        res.off("close", disconnect);
        res.off("finish", release);
      };
      const disconnect = () => { controller.abort(); release(); };
      const uploadTimer = setTimeout(() => {
        controller.abort();
        if (!res.headersSent) {
          res.setHeader("Connection", "close");
          res.status(408).json({ error: "The upload took too long. Please retry.", code: "PDF_UPLOAD_TIMEOUT" });
          res.once("finish", () => req.destroy());
        } else req.destroy();
        release();
      }, 60_000);
      req.once("aborted", disconnect);
      res.once("close", disconnect);
      res.once("finish", release);
      parser(req, res, async error => {
        clearTimeout(uploadTimer);
        if (controller.signal.aborted || res.destroyed) return release();
        if (error) {
          const tooLarge = error.type === "entity.too.large";
          res.status(tooLarge ? 413 : 400).json({
            error: tooLarge ? "PDF references are limited to 15 MB." : "Invalid PDF upload data.",
            code: tooLarge ? "PDF_TOO_LARGE" : "INVALID_PDF_UPLOAD",
          });
          release();
          return;
        }
        extracting = true;
        try {
          const value = req.body?.pdfBase64;
          if (typeof value !== "string" || !value) {
            res.status(400).json({ error: "No PDF was supplied.", code: "MISSING_PDF" }); return;
          }
          if (value.length > MAX_ENCODED + 64) {
            res.status(413).json({ error: "PDF references are limited to 15 MB.", code: "PDF_TOO_LARGE" }); return;
          }
          const encoded = value.replace(/^data:application\/pdf;base64,/i, "");
          if (!encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
            res.status(422).json({ error: "The PDF upload is empty or invalid.", code: "INVALID_BASE64" }); return;
          }
          const buffer = Buffer.from(encoded, "base64");
          if (buffer.length > PDF_REFERENCE_LIMITS.bytes) {
            res.status(413).json({ error: "PDF references are limited to 15 MB.", code: "PDF_TOO_LARGE" }); return;
          }
          if (buffer.toString("base64") !== encoded || buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
            res.status(422).json({ error: "This file is not a valid PDF upload.", code: "INVALID_PDF" }); return;
          }
          const result = await extract(buffer, controller.signal);
          if (controller.signal.aborted) return;
          if (!result.ok) {
            const errors: Record<string, string> = {
              TOO_MANY_PAGES: "Use a PDF reference with at most 150 pages, or select an excerpt.",
              NO_EMBEDDED_TEXT: "No embedded text was found. This file may need OCR; upload readable text or paste it instead.",
              PDF_PARSE_FAILED: "The PDF could not be read. It may be damaged or password-protected.",
            };
            res.status(422).json({ error: errors[result.code] || "The PDF could not be read.", code: result.code }); return;
          }
          const warnings: string[] = [];
          if (result.emptyPages) warnings.push(`No embedded text was extracted from ${result.emptyPages} of ${result.pages} pages. Blank, scanned or illustrated pages may contain no extractable text.`);
          if (result.truncated) warnings.push("Only the first 12,000 characters can be used for this reference.");
          res.json({
            ...result, warnings,
            materiallyIncomplete: result.truncated || result.emptyPages > 0,
          });
        } catch (failure) {
          if (controller.signal.aborted || res.destroyed) return;
          const timedOut = failure instanceof Error && failure.message === "PDF_EXTRACT_TIMEOUT";
          res.status(timedOut ? 504 : 503).json({
            error: timedOut ? "Reading this PDF took too long and was stopped. Try a smaller excerpt." : "The PDF reader is temporarily unavailable. Please retry.",
            code: timedOut ? "PDF_EXTRACT_TIMEOUT" : "PDF_READER_UNAVAILABLE",
          });
        } finally { extracting = false; release(); }
      });
    });
}
