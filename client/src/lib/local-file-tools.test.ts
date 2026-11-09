import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { compressFileLocally, mergeFilesLocally } from "./local-file-tools";

async function fixture(name: string, widths: number[]) {
  const pdf = await PDFDocument.create();
  for (const width of widths) pdf.addPage([width, 500]);
  return new File([new Uint8Array(await pdf.save())], name, { type: "application/pdf" });
}
test("local merge preserves every page and selected file order", async () => {
  const files = [await fixture("a.pdf", [110, 220]), await fixture("b.pdf", [330])];
  const progress: string[] = [];
  const result = await mergeFilesLocally(files, { marked: false, onProgress: message => progress.push(message) });
  const pdf = await PDFDocument.load(await result.blob.arrayBuffer());
  assert.deepEqual(pdf.getPages().map(page => page.getWidth()), [110, 220, 330]);
  assert.ok(progress.some(message => message.includes("2 of 2")));
  assert.equal((await PDFDocument.load(await files[0].arrayBuffer())).getPageCount(), 2);
});
test("local merge rejects corrupt inputs and excess pages, never a partial PDF", async () => {
  const good = await fixture("good.pdf", [100]);
  const bad = new File(["not a PDF"], "damaged.pdf");
  await assert.rejects(mergeFilesLocally([good, bad]), /damaged or password/);
  const large = await fixture("large.pdf", Array(200).fill(100));
  await assert.rejects(mergeFilesLocally([large, good]), /200 pages/);
});
test("local compression preserves readable page content and reports valid MIME", async () => {
  const file = await fixture("pages.pdf", [100, 200, 300]);
  const result = await compressFileLocally(file, "high", { marked: true });
  assert.equal(result.blob.type, "application/pdf");
  assert.equal((await PDFDocument.load(await result.blob.arrayBuffer())).getPageCount(), 3);
});
test("local tasks honor cancellation before processing any file", async () => {
  const file = await fixture("pages.pdf", [100]);
  const controller = new AbortController();
  controller.abort(new Error("Task cancelled."));
  await assert.rejects(mergeFilesLocally([file, file], { signal: controller.signal }), /Task cancelled/);
  await assert.rejects(compressFileLocally(file, "medium", { signal: controller.signal }), /Task cancelled/);
});
