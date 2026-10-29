import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { inspectPowerPointArchive, importPowerPoint, assertPowerPointPageCount } from "../src/powerpoint";

test("PowerPoint archive preflight accepts normal files and rejects damaged archives", async () => {
  const zip = new JSZip();
  zip.file("ppt/presentation.xml", "<presentation/>");
  const bytes = await zip.generateAsync({ type: "arraybuffer" });
  assert.doesNotThrow(() => inspectPowerPointArchive(bytes));
  assert.throws(() => inspectPowerPointArchive(new ArrayBuffer(10)), /valid/);
  const damaged = bytes.slice(0);
  const view = new DataView(damaged);
  // First central-directory record declares an oversized expanded component.
  const central = Array.from({ length: view.byteLength - 4 }, (_, i) => i)
    .find(i => view.getUint32(i, true) === 0x02014b50)!;
  view.setUint32(central + 24, 200 * 1024 * 1024, true);
  assert.throws(() => inspectPowerPointArchive(damaged), /safe import/);
});

test("legacy PPT and oversize PPTX fail explicitly before parsing or changing work", async () => {
  await assert.rejects(importPowerPoint({ name: "old.ppt", size: 100 } as File, { maxPages: 20 }), /saved as .pptx/);
  await assert.rejects(importPowerPoint({ name: "large.pptx", size: 26 * 1024 * 1024 } as File, { maxPages: 20 }), /25 MB/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(importPowerPoint({ name: "cancel.pptx", size: 100 } as File, { maxPages: 20, signal: controller.signal }), /cancelled/);
});
test("PowerPoint overflow reports the resulting merge total and the actual plan limit", () => {
  assert.throws(() => assertPowerPointPageCount(21, 6, 20), /27 pages, exceeding your 20-page/);
  assert.doesNotThrow(() => assertPowerPointPageCount(14, 6, 20));
  assert.throws(() => assertPowerPointPageCount(51, 0, 50), /51 pages, exceeding your 50-page/);
});
