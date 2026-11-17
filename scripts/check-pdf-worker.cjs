// Local smoke check only: no external AI, database, uploaded user data or writes.
const { Worker } = require("node:worker_threads");
const { PDFDocument, StandardFonts } = require("pdf-lib");
const path = require("node:path");
(async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage().drawText("BrightBoard worker release check", { x: 40, y: 700, font });
  const worker = new Worker(path.resolve("dist/pdfExtractWorker.cjs"), {
    workerData: { buffer: await pdf.save(), maxPages: 150, maxChars: 12000 },
    resourceLimits: { maxOldGenerationSizeMb: 192, maxYoungGenerationSizeMb: 32 },
    execArgv: [],
  });
  let timer;
  try {
    await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Worker check timed out")), 15000);
      worker.once("error", reject);
      worker.once("exit", () => reject(new Error("Worker exited without a checked result")));
      worker.once("message", result => {
        if (result.ok !== true || result.text !== "BrightBoard worker release check" || result.truncated !== false) reject(new Error("Unexpected worker result"));
        else resolve();
      });
    });
    console.log("PASS: Compiled PDF worker and installed parser dependency verified.");
  } finally { clearTimeout(timer); await worker.terminate(); }
})().catch(() => { console.error("FAIL: Compiled PDF worker check failed. Website was not restarted."); process.exitCode = 1; });
