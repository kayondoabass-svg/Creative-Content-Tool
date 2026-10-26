import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { generateContentSchema, imageOptionsSchema, logoAdjustmentSchema } from "../shared/schema";
import { compositeExactLogo, composeImageGrid, prepareExactLogo, resolveLogoPosition, recomposeExactLogo, validateLogoSources, MAX_LOGO_SOURCE_BYTES } from "./exactLogoService";
import { generateEducationalImage } from "./educationalImageService";

async function fixtures() {
  const base = await sharp({ create: { width: 200, height: 100, channels: 4, background: "#ffffff" } }).png().toBuffer();
  const pixels = Buffer.alloc(40 * 20 * 4);
  for (let y = 0; y < 20; y++) {
    for (let x = 10; x < 40; x++) {
      const offset = (y * 40 + x) * 4;
      pixels[offset] = 240;
      pixels[offset + 1] = 20;
      pixels[offset + 2] = 60;
      pixels[offset + 3] = x < 20 ? 128 : 255;
    }
  }
  const logo = await sharp(pixels, { raw: { width: 40, height: 20, channels: 4 } }).png().toBuffer();
  return { base: base.toString("base64"), logo, reference: `data:image/png;base64,${logo.toString("base64")}` };
}

async function pixel(image: string, x: number, y: number) {
  return [...await sharp(Buffer.from(image, "base64")).ensureAlpha()
    .extract({ left: x, top: y, width: 1, height: 1 }).raw().toBuffer()];
}

test("prompt-informed positions and explicit overrides", () => {
  const cases = [
    ["Put the logo in the top-right corner", "top-right"],
    ["logo at upper left", "top-left"],
    ["logo bottom centre", "bottom-center"],
    ["logo right bottom", "bottom-right"],
    ["Place logo in the middle left", "center-left"],
    ["Place logo in the center", "center"],
    ["Draw the sun top left; put the logo bottom right", "bottom-right"],
    ["Draw a tree on the left, logo in the middle right", "center-right"],
    ["A solar system diagram", "top-right"],
  ] as const;
  for (const [prompt, expected] of cases) assert.equal(resolveLogoPosition(prompt, "auto"), expected);
  assert.equal(resolveLogoPosition("logo top-right", "bottom-left"), "bottom-left");
});

test("native-size original pixels, transparency, and aspect ratio are preserved", async () => {
  const { base, logo, reference } = await fixtures();
  const prepared = await prepareExactLogo(reference);
  assert.deepEqual(await sharp(prepared).raw().toBuffer(), await sharp(logo).raw().toBuffer());
  const result = await compositeExactLogo(base, prepared, { logoWidthPercent: 20, logoMarginPercent: 4 }, "top-right");
  // Logo bounds: x152..191, y4..23. Transparent pixels reveal original design.
  assert.deepEqual(await pixel(result, 152, 4), [255, 255, 255, 255]);
  assert.deepEqual(await pixel(result, 172, 4), [240, 20, 60, 255]);
  const translucent = await pixel(result, 162, 4);
  assert.ok(translucent[0] >= 247 && translucent[0] <= 248);
  assert.ok(translucent[1] >= 136 && translucent[1] <= 138);
  assert.deepEqual(await pixel(result, 172, 23), [240, 20, 60, 255]);
  assert.deepEqual(await pixel(result, 172, 24), [255, 255, 255, 255]);
  assert.deepEqual(await pixel(result, 192, 4), [255, 255, 255, 255]);
});

test("all nine anchors, manual size, and edge margin are respected", async () => {
  const { base, logo } = await fixtures();
  const anchors = {
    "top-left": [0, 0], "top-center": [80, 0], "top-right": [160, 0],
    "center-left": [0, 40], center: [80, 40], "center-right": [160, 40],
    "bottom-left": [0, 80], "bottom-center": [80, 80], "bottom-right": [160, 80],
  } as const;
  for (const [position, [x, y]] of Object.entries(anchors)) {
    const result = await compositeExactLogo(base, logo, { logoWidthPercent: 20, logoMarginPercent: 0 }, position as keyof typeof anchors);
    assert.deepEqual(await pixel(result, x + 25, y + 10), [240, 20, 60, 255], position);
  }
  const smaller = await compositeExactLogo(base, logo, { logoWidthPercent: 10, logoMarginPercent: 10 }, "bottom-right");
  assert.deepEqual(await pixel(smaller, 175, 85), [240, 20, 60, 255]);
  assert.deepEqual(await pixel(smaller, 180, 85), [255, 255, 255, 255]);
  const tallLogo = await sharp({ create: { width: 1, height: 500, channels: 4, background: "#f0143c" } }).png().toBuffer();
  await compositeExactLogo(base, tallLogo, { logoWidthPercent: 40, logoMarginPercent: 15 }, "bottom-left");
});

test("valid PNG, JPEG, WebP logos decode, and corrupt or missing uploads fail before generation", async () => {
  const { logo } = await fixtures();
  for (const format of ["png", "jpeg", "webp"] as const) {
    const encoded = await sharp(logo).toFormat(format).toBuffer();
    const decoded = await prepareExactLogo(`data:image/${format};base64,${encoded.toString("base64")}`);
    const meta = await sharp(decoded).metadata();
    assert.equal(meta.width, 40);
    assert.equal(meta.height, 20);
    assert.equal(meta.format, "png");
  }
  let calls = 0;
  const generate = async () => { calls++; return { data: [] }; };
  for (const reference of [undefined, "https://example.com/logo.png", "data:image/png;base64,YmFk"]) {
    await assert.rejects(generateEducationalImage("logo", "", "Test", { logoMode: "exact" }, reference, generate));
  }
  assert.equal(calls, 0);
});

test("exact mode bypasses Gemini reference redrawing; regeneration composites original again", async () => {
  const { base, reference } = await fixtures();
  let calls = 0;
  const generate = async (prompt: string, attachment?: string) => {
    calls++;
    assert.equal(attachment, undefined);
    assert.match(prompt, /Do NOT draw, recreate/);
    assert.match(prompt, /at bottom-left/);
    return { data: [{ b64_json: base }] };
  };
  const options = { logoMode: "exact", logoPosition: "auto", logoWidthPercent: 20 } as const;
  const first = await generateEducationalImage("logo in bottom-left", "", "Test", options, reference, generate);
  const regenerated = await generateEducationalImage("logo in bottom-left", "", "Test", options, reference, generate);
  assert.equal(calls, 2);
  assert.equal(first.b64_json, regenerated.b64_json);
  assert.equal(first.options.resolvedLogoPosition, "bottom-left");
  assert.deepEqual(await pixel(first.b64_json, 28, 76), [240, 20, 60, 255]);
});

test("creative-reference mode still forwards the unmodified attachment", async () => {
  const { base, reference } = await fixtures();
  const generate = async (prompt: string, attachment?: string) => {
    assert.equal(attachment, reference);
    assert.match(prompt, /Use the attached image/);
    return { data: [{ b64_json: base }] };
  };
  const result = await generateEducationalImage("Classroom", "", "Test", {}, reference, generate);
  assert.equal(result.b64_json, base);
});

test("all four grid variations and complete PNG download include the finished composition", async () => {
  const { base, reference } = await fixtures();
  let calls = 0;
  const result = await generateEducationalImage("logo top right", "", "Grid", { logoMode: "exact", layout: "grid" }, reference, async () => {
    calls++;
    return { data: [{ b64_json: base }] };
  });
  assert.equal(calls, 4);
  assert.equal(result.images?.length, 4);
  for (const image of result.images!) assert.deepEqual(await pixel(image, 172, 4), [240, 20, 60, 255]);
  const meta = await sharp(Buffer.from(result.b64_json, "base64")).metadata();
  assert.equal(meta.width, 400);
  assert.equal(meta.height, 200);
  for (const [x, y] of [[172, 4], [372, 4], [172, 104], [372, 104]]) {
    assert.deepEqual(await pixel(result.b64_json, x, y), [240, 20, 60, 255]);
  }
  await assert.rejects(composeImageGrid([base]), /all four/);
});

test("failed generation never returns a partial grid or an unbranded image", async () => {
  const { base, reference } = await fixtures();
  let calls = 0;
  await assert.rejects(generateEducationalImage("Logo", "", "Test", { logoMode: "exact", layout: "grid" }, reference, async () => {
    return { data: ++calls === 2 ? [{}] : [{ b64_json: base }] };
  }), /temporarily unavailable/);
});

test("request schema rejects invalid exact-logo controls and requires an upload", () => {
  assert.equal(generateContentSchema.safeParse({ type: "image", prompt: "Hello", imageOptions: { logoMode: "exact" } }).success, false);
  for (const options of [
    { logoMode: "unknown" }, { logoPosition: "offscreen" },
    { logoWidthPercent: 4 }, { logoWidthPercent: 41 },
    { logoMarginPercent: -1 }, { logoMarginPercent: 16 }, { logoWidthPercent: "20" },
  ]) assert.equal(imageOptionsSchema.safeParse(options).success, false);
  assert.equal(imageOptionsSchema.safeParse({ logoMode: "exact", logoPosition: "auto", logoWidthPercent: 5, logoMarginPercent: 0 }).success, true);
  assert.equal(generateContentSchema.safeParse({ type: "image", prompt: "Hello" }).success, true);
});

test("saved single and grid edits start from original backgrounds and need no model calls", async () => {
  const { base, reference } = await fixtures();
  for (const layout of ["single", "grid"] as const) {
    let calls = 0;
    const generated = await generateEducationalImage("logo", "", "Editable", { logoMode: "exact", layout }, reference, async () => {
      calls++;
      return { data: [{ b64_json: base }] };
    });
    assert.deepEqual(generated.logoSources?.backgrounds, Array(layout === "grid" ? 4 : 1).fill(base));
    assert.equal(generated.logoSources?.logo, reference);
    const moved = await recomposeExactLogo(generated.logoSources!, {
      logoPosition: "bottom-left", logoWidthPercent: 20, logoMarginPercent: 0,
    });
    assert.equal(calls, layout === "grid" ? 4 : 1);
    // Old top-right logo is gone; original background is restored.
    assert.deepEqual(await pixel(moved.b64_json, 172, 4), [255, 255, 255, 255]);
    assert.deepEqual(await pixel(moved.b64_json, 25, 85), [240, 20, 60, 255]);
    if (layout === "grid") {
      assert.equal(moved.images?.length, 4);
      assert.equal(moved.b64_json, await composeImageGrid(moved.images!));
      for (const [x, y] of [[25, 85], [225, 85], [25, 185], [225, 185]]) {
        assert.deepEqual(await pixel(moved.b64_json, x, y), [240, 20, 60, 255]);
      }
    }
    const repeat = await recomposeExactLogo(generated.logoSources!, {
      logoPosition: "bottom-left", logoWidthPercent: 20, logoMarginPercent: 0,
    });
    assert.equal(repeat.b64_json, moved.b64_json);
  }
});

test("adjustment accepts only complete bounded controls and enforces source budget", () => {
  const valid = { logoPosition: "center", logoWidthPercent: 5, logoMarginPercent: 0 };
  assert.ok(logoAdjustmentSchema.safeParse(valid).success);
  for (const invalid of [
    {}, { ...valid, logoPosition: "auto" }, { ...valid, logoWidthPercent: 41 },
    { ...valid, logoMarginPercent: -1 }, { ...valid, backgrounds: ["injected"] },
  ]) assert.equal(logoAdjustmentSchema.safeParse(invalid).success, false);
  assert.throws(() => validateLogoSources({ backgrounds: [], logo: "" }), /one or four/);
  assert.throws(() => validateLogoSources({ backgrounds: ["x".repeat(MAX_LOGO_SOURCE_BYTES)], logo: "" }), /48MB/);
});
