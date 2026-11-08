import test from "node:test";
import assert from "node:assert/strict";
import { buildWordSearch, validateWorksheet, worksheetLines } from "../shared/worksheet-quality";
import { worksheetPages, registerWorksheetExport } from "./worksheet-export";
import { sharingOriginAllowed } from "./document-sharing-routes";
import express from "express";
import { PDFDocument } from "pdf-lib";

test("all puzzle words occur at their exact answer coordinates", () => {
  for (let i = 0; i < 100; i++) {
    const puzzle = buildWordSearch(["train", "TAXI", "train", "bridge", "bicycle", "airport", "river"]);
    assert.equal(puzzle.words.length, 6);
    for (const { word, row, column } of puzzle.answerKey) assert.equal(puzzle.grid[row].slice(column, column + word.length).join(""), word);
    assert.ok(puzzle.grid.every(r => r.every(c => /^[A-Z]$/.test(c))));
  }
  assert.throws(() => buildWordSearch(["a", "b"]));
});
test("question validation rejects empty, duplicate and invalid answer data", () => {
  assert.throws(() => validateWorksheet({ title: "Test", layout: "multipleChoice", questions: [{ question: "Q?", options: ["A", "B"], answer: "D" }] }));
  assert.throws(() => validateWorksheet({ title: "Test", layout: "matching", pairs: [{ left: "Boat", right: "" }] }));
  assert.throws(() => validateWorksheet({ title: "Test", layout: "fillBlank", questions: [{ textBeforeBlank: "The", answer: "" }] }));
  assert.throws(() => validateWorksheet({ title: "Test", layout: "writing", prompts: [{ text: "Same" }, { text: "Same" }] }));
});
test("every existing worksheet layout exports student exercises without answer leakage", () => {
  const variants = [
    { layout: "pictureGrid", questions: [{ textBeforeBlank: "Ride a", textAfterBlank: ".", answer: "PRIVATE", options: "(bus/train)" }] },
    { layout: "fillBlank", questions: [{ textBeforeBlank: "Travel by", answer: "PRIVATE" }] },
    { layout: "multipleChoice", questions: [{ question: "Choose transport", options: ["A) Bus", "B) Apple"], answer: "PRIVATE" }] },
    { layout: "matching", pairs: [{ left: "Bus", right: "Transport" }, { left: "Apple", right: "Fruit" }] },
    { layout: "trueOrFalse", statements: [{ text: "A bus is transport", answer: true }] },
    { layout: "writing", prompts: [{ text: "Describe travel", lines: 3 }] },
    { layout: "mixed", sections: [{ title: "Travel", content: ["Describe a bus"], answers: ["PRIVATE"] }] },
    { layout: "wordSearch", ...buildWordSearch(["BUS", "TAXI", "TRAIN"]) },
  ];
  for (const variant of variants) {
    const data = { title: "Hà Nội & <travel>", instructions: "Complete the task.", ...variant };
    assert.ok(worksheetLines(data).length > 4, variant.layout);
    const pages = worksheetPages(data);
    assert.ok(pages.join("").includes("&amp; &lt;travel&gt;"));
    assert.ok(!pages.join("").includes("PRIVATE"));
  }
});
test("long exports paginate instead of cropping later exercises", () => {
  const pages = worksheetPages({ title: "Long", layout: "fillBlank", questions: Array.from({ length: 100 }, (_, i) => ({ textBeforeBlank: `Exercise ${i}` })) });
  assert.ok(pages.length > 2);
  assert.match(pages.at(-1)!, /Exercise 99/);
});
test("BrightBoard origins survive reverse proxies without admitting scammers", () => {
  const request = (origin: string, host = "127.0.0.1:5000", site = "same-origin") => ({ headers: { origin, "sec-fetch-site": site }, get: () => host }) as any;
  assert.equal(sharingOriginAllowed(request("https://www.brightboardapp.com")), true);
  assert.equal(sharingOriginAllowed(request("https://brightboardapp.com")), true);
  assert.equal(sharingOriginAllowed(request("https://scammer.example")), false);
  assert.equal(sharingOriginAllowed(request("https://www.brightboardapp.com", "localhost", "cross-site")), false);
});
test("real PDF and multi-page JPEG exports work including Unicode", async () => {
  const app = express(); app.use(express.json()); registerWorksheetExport(app);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address() as any;
  try {
    const data = { title: "Hà Nội", layout: "wordSearch", ...buildWordSearch(["TRAIN", "BUS", "TAXI"]) };
    const response = await fetch(`http://127.0.0.1:${address.port}/api/worksheets/export`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: JSON.stringify(data), format: "pdf" }) });
    assert.equal(response.status, 200);
    const body = await response.json();
    const pdf = await PDFDocument.load(Buffer.from(body.file.split(",")[1], "base64"));
    assert.ok(pdf.getPageCount() >= 1);
    const images = await fetch(`http://127.0.0.1:${address.port}/api/worksheets/export`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: JSON.stringify({ title: "Many", layout: "writing", prompts: Array.from({ length: 12 }, (_, i) => ({ text: `Prompt ${i}`, lines: 6 })) }), format: "jpeg" }) });
    const result = await images.json();
    assert.ok(result.files.length > 1);
    assert.ok(result.files.every((p: any) => p.file.startsWith("data:image/jpeg;base64,")));
  } finally { server.close(); }
});
