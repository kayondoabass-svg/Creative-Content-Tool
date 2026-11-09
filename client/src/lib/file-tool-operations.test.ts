import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { extractWordText, paginateText, parsePageRanges, splitPdf, textToPresentation, textToWord, validateInput, WORD_MIME } from "./file-tool-operations";

test("page ranges validate before copying and never discard invalid entries", () => {
  assert.deepEqual(parsePageRanges("3,1-2,2", 5), [0, 1, 2]);
  for (const value of ["", "0", "2-1", "1,301", "cat", "1-400", "1.5"]) assert.throws(() => parsePageRanges(value, 300));
});
test("input validation reports legacy Word and oversized files explicitly", () => {
  assert.throws(() => validateInput({ name: "old.doc", size: 12 }), /\.docx/);
  assert.throws(() => validateInput({ name: "big.pdf", size: 21 * 1024 * 1024 }), /20 MB/);
  assert.throws(() => validateInput({ name: "empty.docx", size: 0 }), /empty/);
});
test("split exports valid selected pages without modifying source", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage([100, 200]); pdf.addPage([200, 300]); pdf.addPage([300, 400]);
  const bytes = await pdf.save();
  const input = new File([new Uint8Array(bytes)], "test.pdf", { type: "application/pdf" });
  const combined = await splitPdf(input, "1,3", false, false);
  const out = await PDFDocument.load(await combined[0].blob.arrayBuffer());
  assert.equal(out.getPageCount(), 2);
  assert.equal(out.getPage(1).getWidth(), 300);
  assert.equal((await PDFDocument.load(await input.arrayBuffer())).getPageCount(), 3);
  const separate = await splitPdf(input, "2-3", true, true);
  assert.equal(separate.length, 2);
  for (const result of separate) assert.equal((await PDFDocument.load(await result.blob.arrayBuffer())).getPageCount(), 1);
  await assert.rejects(splitPdf(input, "9", false), /between/);
});
test("Word text extraction preserves Unicode and refuses non-Word ZIPs", async () => {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file("_rels/.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file("word/document.xml", '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hà Nội • Kampala مرحبا</w:t></w:r></w:p></w:body></w:document>');
  const bytes = await zip.generateAsync({ type: "arraybuffer" });
  assert.match(await extractWordText(bytes), /Hà Nội • Kampala مرحبا/);
  const invalid = await new JSZip().file("not-word.txt", "test").generateAsync({ type: "arraybuffer" });
  await assert.rejects(extractWordText(invalid), /not a valid DOCX/);
});
test("PowerPoint output is a real ZIP and long text is paginated", async () => {
  const text = "Reliable lesson content ".repeat(200);
  const chunks = paginateText(text);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(p => p.length <= 900));
  assert.equal(chunks.join(" ").replace(/\s/g, ""), text.replace(/\s/g, ""));
  const result = await textToPresentation(text, "Lesson.docx");
  const zip = await JSZip.loadAsync(await result.blob.arrayBuffer());
  const slides = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  assert.equal(slides.length, chunks.length);
  assert.ok(await zip.file(slides[0])!.async("text").then(t => t.includes("brightboardapp.com")));
});
test("Word export produces parseable DOCX, escapes markup and preserves Unicode", async () => {
  const text = 'Hà Nội & Kampala <script>alert("no")</script>\nمرحبا';
  const result = await textToWord(text, "Lesson.pdf", false);
  assert.equal(result.blob.type, WORD_MIME);
  assert.equal(result.name, "Lesson.docx");
  assert.equal((await extractWordText(await result.blob.arrayBuffer())).replace(/\s+/g, " ").trim(), text.replace(/\s+/g, " ").trim());
  const zip = await JSZip.loadAsync(await result.blob.arrayBuffer());
  const xml = await zip.file("word/document.xml")!.async("text");
  assert.ok(xml.includes("&lt;script&gt;"));
  assert.ok(!xml.includes("<script>"));
});
