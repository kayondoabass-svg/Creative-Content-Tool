import assert from "node:assert/strict";
import { test } from "node:test";
import { generateGeminiImage } from "./geminiImageService";

const fixture = "data:image/png;base64,aGVsbG8=";

async function withProvider(mock: typeof fetch, run: () => Promise<void>) {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.GEMINI_API_KEY;
  globalThis.fetch = mock;
  process.env.GEMINI_API_KEY = "test-image-key";
  try {
    await run();
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
}

test("image generation sends the actual attachment alongside placement instructions", async () => {
  await withProvider(async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.contents[0].parts[0].text, "Place this logo in the top-right corner");
    assert.deepEqual(body.contents[0].parts[1], {
      inlineData: { mimeType: "image/png", data: "aGVsbG8=" },
    });
    return Response.json({ candidates: [{ content: { parts: [{ inlineData: { data: "generated-image" } }] } }] });
  }, async () => {
    assert.deepEqual(await generateGeminiImage("Place this logo in the top-right corner", fixture), {
      data: [{ b64_json: "generated-image" }],
    });
  });
});

test("reference images are never silently dropped for a text-only fallback", async () => {
  let calls = 0;
  await withProvider(async (url) => {
    calls++;
    assert.ok(String(url).includes(":generateContent"));
    return new Response("unavailable", { status: 503 });
  }, async () => {
    await assert.rejects(generateGeminiImage("Use the attached logo", fixture), /attachment.*temporarily unavailable/);
    assert.equal(calls, 2);
  });
});

test("text-only image generation still has its Imagen fallback", async () => {
  let calls = 0;
  await withProvider(async (url, init) => {
    calls++;
    if (String(url).includes(":generateContent")) return new Response("unavailable", { status: 503 });
    const body = JSON.parse(String(init?.body));
    assert.equal(body.instances[0].prompt, "A classroom");
    return Response.json({ predictions: [{ bytesBase64Encoded: "fallback-image" }] });
  }, async () => {
    assert.deepEqual(await generateGeminiImage("A classroom"), { data: [{ b64_json: "fallback-image" }] });
    assert.equal(calls, 3);
  });
});

test("invalid attachment data is rejected before calling the provider", async () => {
  await withProvider(async () => { throw new Error("Unexpected provider call"); }, async () => {
    await assert.rejects(generateGeminiImage("A classroom", "https://example.com/image.png"), /Invalid reference image/);
  });
});
