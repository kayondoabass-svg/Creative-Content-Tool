import test from "node:test";
import assert from "node:assert/strict";
import { optimizeLessonImages } from "../src/image-optimization";
import { blankPage, initialState, newLesson } from "../src/types";
import { lessonFromJSON } from "../src/helpers";
import { assertRelaySize, lessonBlob, MAX_RELAY_ASSET_LENGTH, MAX_RELAY_BYTES, presentationSizes, serializedBytes } from "../src/presentation-size";
import { writeLessonFile } from "../src/local-files";
import { stateSchema } from "./relay";

const png = (length: number) => `data:image/png;base64,${"A".repeat(length)}`;
function fixture() {
  const lesson = newLesson();
  lesson.title = "Science 🌍 — café";
  lesson.pages.push(blankPage("Second page"));
  for (const [index, page] of lesson.pages.entries()) {
    page.notes = `Private notes ${index} — do not lose`;
    page.ink = [{ id: `ink-${index}`, color: "#123456", width: 4, highlighter: true, points: [{ x: .1, y: .2 }, { x: .8, y: .9 }] }];
    page.objects = [
      { id: `image-${index}`, type: "image", x: .17, y: .22, width: .63, height: .5, color: "#123456", locked: true, src: png(4096) },
      { id: `text-${index}`, type: "text", text: "Text stays editable", fontSize: 32, x: .1, y: .8, width: .4, height: .1, color: "#123456" },
    ];
    page.model = { src: "/tv-assets/models/heart.glb", name: "Heart", attribution: "Original attribution", license: "CC0", cameraOrbit: "1rad 2rad 3m", hotspots: [{ id: `hotspot-${index}`, label: "Look here", description: "Detail", position: "0m 0m 0m", normal: "0 1 0" }] };
  }
  return lesson;
}
test("size is compact UTF-8 serialized bytes, identical to download, local save and relay", async () => {
  const lesson = fixture(), state = initialState(lesson);
  const sizes = presentationSizes(lesson, state);
  assert.equal(sizes.file, Buffer.byteLength(JSON.stringify(lesson)));
  assert.equal(sizes.file, lessonBlob(lesson).size);
  assert.equal(sizes.relay, Buffer.byteLength(JSON.stringify(state)));
  assert.ok(sizes.file > JSON.stringify(lesson).length, "Unicode is measured in bytes, not JS character count");
  let written: Blob | undefined;
  await writeLessonFile({ name: "test.bbtv", getFile: async () => { throw new Error("unused"); },
    createWritable: async () => ({ write: async body => { written = body; }, close: async () => {}, abort: async () => {} }) }, lesson);
  assert.equal(written!.size, sizes.file);
  assert.deepEqual(lessonFromJSON(await written!.text()), lesson);
});
test("optimization reduces size and preserves every non-image field; original is unchanged and copy exports", async () => {
  const original = fixture(), snapshot = structuredClone(original);
  let encodes = 0;
  const result = await optimizeLessonImages(original, { maxDimension: 1280, quality: .7 }, async (_src, options) => {
    encodes++;
    assert.deepEqual(options, { maxDimension: 1280, quality: .7 });
    return png(128);
  });
  assert.equal(encodes, 1, "duplicate sources are encoded once");
  assert.equal(result.changed, 2);
  assert.equal(result.skipped, 0);
  assert.ok(lessonBlob(result.lesson).size < lessonBlob(original).size);
  assert.deepEqual(original, snapshot);
  const restoredImages = structuredClone(result.lesson);
  restoredImages.pages.forEach((page, i) => { page.objects[0].src = original.pages[i].objects[0].src; });
  assert.deepEqual(restoredImages, original, "pages, notes, ink, positions, models, hotspots and metadata all survive");
  const reopened = lessonFromJSON(await lessonBlob(result.lesson).text());
  assert.deepEqual(reopened, result.lesson);
  assert.ok(stateSchema.safeParse(initialState(reopened)).success, "optimized export is relay-valid");
});
test("GIFs, decode failures, invalid encoder output and non-smaller images remain untouched", async () => {
  const original = fixture();
  original.pages[1].objects[0].src = "data:image/gif;base64,AAAA";
  for (const encoder of [
    async () => { throw new Error("bad image"); },
    async () => png(8192),
    async () => "not an image",
  ]) {
    const result = await optimizeLessonImages(original, { maxDimension: 1920, quality: .85 }, encoder);
    assert.equal(result.changed, 0);
    assert.equal(result.skipped, 2);
    assert.deepEqual(result.lesson, original);
  }
});
test("relay preflight accepts the exact limit and refuses one extra serialized byte", () => {
  const state = initialState();
  state.lesson.title = "x".repeat(MAX_RELAY_BYTES - serializedBytes(state) + state.lesson.title.length);
  assert.equal(serializedBytes(state), MAX_RELAY_BYTES);
  assert.doesNotThrow(() => assertRelaySize(state));
  state.lesson.title += "x";
  assert.throws(() => assertRelaySize(state), /12 MB/);
});
test("optimization can bring a large presentation below relay limit without truncating pages", async () => {
  const original = fixture();
  original.pages.forEach(page => { page.objects[0].src = png(7 * 1024 * 1024); });
  assert.throws(() => assertRelaySize(initialState(original)), /12 MB/);
  const result = await optimizeLessonImages(original, { maxDimension: 1280, quality: .7 }, async () => png(128));
  assert.doesNotThrow(() => assertRelaySize(initialState(result.lesson)));
  assert.equal(result.lesson.pages.length, original.pages.length);
  assert.ok(stateSchema.safeParse(initialState(result.lesson)).success);
});
test("bad optimization settings reject without mutation", async () => {
  const original = fixture(), snapshot = structuredClone(original);
  await assert.rejects(optimizeLessonImages(original, { maxDimension: 0, quality: .85 }), /image size/);
  assert.deepEqual(original, snapshot);
});
test("a single encoded image or model must fit the relay asset limit even below 12 MB total", () => {
  const lesson = fixture();
  lesson.pages[0].objects[0].src = png(MAX_RELAY_ASSET_LENGTH);
  const state = initialState(lesson);
  assert.ok(serializedBytes(state) < MAX_RELAY_BYTES);
  assert.throws(() => assertRelaySize(state), /8 MB/);
  lesson.pages[0].objects[0].src = png(128);
  lesson.pages[0].model!.src = `data:model/gltf-binary;base64,${"A".repeat(MAX_RELAY_ASSET_LENGTH)}`;
  assert.throws(() => assertRelaySize(state), /8 MB/);
});
