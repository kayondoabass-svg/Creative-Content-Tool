import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import http from "node:http";
import { once } from "node:events";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { build } from "esbuild";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { collectPdfReferenceText } from "./pdf-reference-text";
import { registerPdfExtraction, runPdfWorker } from "./pdf-extraction";
import { gameReferenceMessages } from "./presentation-reference";
import { validateGameContent } from "./generation-validation";
import { checkedTemplateAnalysis } from "./template-analysis";

test("PDF text normalization, exact limit, separator boundary and complete page statistics", () => {
  const page = (...strings: string[]) => ({ content: strings.map(str => ({ str })) });
  const normal = collectPdfReferenceText([page("A          B", "TAIL")], 10);
  assert.equal(normal.text, "A B TAIL"); assert.equal(normal.truncated, false);
  assert.equal(collectPdfReferenceText([page("ABCDE")], 5).truncated, false);
  const limited = collectPdfReferenceText([page("ABCDEFGHIJK"), page(), page("Later")], 5);
  assert.equal(limited.text, "ABCDE"); assert.equal(limited.truncated, true);
  assert.equal(limited.emptyPages, 1); assert.equal(limited.examinedPages, 3);
  assert.equal(collectPdfReferenceText([page("First"), page("Second")], 6).text, "First");
  assert.equal(collectPdfReferenceText([page("First"), page("Second")], 6).truncated, true);
  assert.throws(() => collectPdfReferenceText([], 0));
  assert.throws(() => collectPdfReferenceText([{ content: null } as any], 10));
});

test("game sources are explicit, bounded and never silently shortened", () => {
  const messages = gameReferenceMessages({ documentContext: "Private lesson about habitats", keyPoints: [" ", " Animals "] });
  assert.match(messages[0].content, /Private lesson about habitats/);
  assert.match(messages[1].content, /Animals/);
  assert.doesNotMatch(messages[1].content, /" "/);
  assert.throws(() => gameReferenceMessages({ documentContext: "" }));
  assert.throws(() => gameReferenceMessages({ documentContext: "x".repeat(15001) }));
  assert.throws(() => gameReferenceMessages({ keyPoints: Array(31).fill("fact") }));
});

test("game questions and uploaded template results cannot silently accept missing answers", () => {
  assert.throws(() => validateGameContent({ title: "Quiz", questions: [{ question: "Q", a: "A", b: "B", c: "C", d: "D", correct: "z" }] }, "vocabularyQuiz"));
  assert.doesNotThrow(() => validateGameContent({ title: "Quiz", questions: [{ question: "Q", a: "A", b: "B", c: "C", d: "D", correct: "a" }] }, "vocabularyQuiz"));
  assert.throws(() => checkedTemplateAnalysis({}));
  assert.throws(() => checkedTemplateAnalysis({ categories: ["Reading"], ratingScale: ["Good"], nameField: { x: -5, y: 20 } }));
  assert.deepEqual(checkedTemplateAnalysis({ categories: ["Reading"], ratingScale: ["Good"] }).categories, ["Reading"]);
  assert.throws(() => checkedTemplateAnalysis({ categories: ["Reading"], ratingScale: ["Good"], nameField: { x: 20, y: 20 } }, true));
  assert.equal(checkedTemplateAnalysis({ categories: ["Reading"], ratingScale: ["Good"], nameField: { x: 20, y: 20 }, ratings: [{ category: "Reading", positions: { Good: { x: 40, y: 50 } } }] }, true).ratings?.length, 1);
});

test("actual dev and built workers parse PDFs, stop on abort/timeout and reject exit without result", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "brightboard-pdf-"));
  try {
    const worker = path.join(directory, "pdfExtractWorker.cjs");
    // The production worker resolves the existing runtime dependency from this repository.
    await build({ entryPoints: ["server/workers/pdfExtractWorker.ts"], bundle: true, platform: "node", format: "cjs", outfile: worker, external: ["pdf.js-extract"], nodePaths: [path.resolve("node_modules")] });
    // A build normally lives under dist/, so make dependency resolution equivalent in the fixture.
    const compiled = await readFile(worker, "utf8");
    await writeFile(worker, `const originalRequire = require; require = (id) => id === "pdf.js-extract" ? originalRequire(${JSON.stringify(path.resolve("node_modules/pdf.js-extract/lib/index.js"))}) : originalRequire(id);\n` + compiled);
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf.addPage().drawText("BrightBoard PDF reference", { x: 40, y: 700, font });
    const bytes = Buffer.from(await pdf.save());
    for (const file of [undefined, worker]) {
      const result = await runPdfWorker(bytes, new AbortController().signal, 15_000, file);
      assert.equal(result.ok, true);
      if (result.ok) assert.match(result.text, /BrightBoard PDF reference/);
    }
    const blank = await PDFDocument.create(); blank.addPage();
    const empty = await runPdfWorker(Buffer.from(await blank.save()), new AbortController().signal, 15_000, worker);
    assert.equal(empty.ok, false);
    if (!empty.ok) assert.equal(empty.code, "NO_EMBEDDED_TEXT");
    const hung = path.join(directory, "hung.cjs");
    await writeFile(hung, "setInterval(()=>{},1000)");
    await assert.rejects(runPdfWorker(bytes, new AbortController().signal, 30, hung), /TIMEOUT/);
    const abort = new AbortController();
    const waiting = runPdfWorker(bytes, abort.signal, 15_000, hung);
    abort.abort();
    await assert.rejects(waiting, /CLIENT_DISCONNECTED/);
    const exited = path.join(directory, "exit.cjs"); await writeFile(exited, "");
    await assert.rejects(runPdfWorker(bytes, new AbortController().signal, 15_000, exited), /NO_RESULT/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("PDF endpoint checks auth before buffering, reserves upload capacity and releases on disconnect", async () => {
  const app = express();
  registerPdfExtraction(app, (req, res, next) => req.get("X-Test-User") ? next() : res.status(401).json({ error: "Sign in" }),
    async () => ({ ok: true, text: "Source", pages: 1, examinedPages: 1, emptyPages: 0, statsComplete: true, truncated: false }));
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const port = (server.address() as any).port;
  const url = `http://127.0.0.1:${port}/api/extract-pdf-text`;
  const headers = { "Content-Type": "application/json", "X-Test-User": "owner" };
  const body = JSON.stringify({ pdfBase64: Buffer.from("%PDF-test").toString("base64") });
  try {
    assert.equal((await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body })).status, 401);
    const held = http.request(url, { method: "POST", headers }); held.on("error", () => {}); held.write('{"pdfBase64":"');
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal((await fetch(url, { method: "POST", headers, body })).status, 429);
    held.destroy();
    await new Promise(resolve => setTimeout(resolve, 25));
    const result = await fetch(url, { method: "POST", headers, body });
    assert.equal(result.status, 200);
    assert.match(result.headers.get("Cache-Control")!, /no-store/);
    assert.equal((await result.json()).materiallyIncomplete, false);
    assert.equal((await fetch(url, { method: "POST", headers, body: '{"pdfBase64":"@@@@"}' })).status, 422);
    assert.equal((await fetch(url, { method: "POST", headers, body: "{" })).status, 400);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
