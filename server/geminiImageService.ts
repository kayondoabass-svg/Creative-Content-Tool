/**
 * Gemini image generation via raw REST API — no SDK, no external dependencies.
 * Returns { data: [{ b64_json }] } so all callers work unchanged.
 *
 * Strategy (in order):
 *  1. gemini-2.5-flash-image  → generateContent with responseModalities IMAGE
 *  2. gemini-3.1-flash-image-preview → same
 *  3. imagen-4.0-fast-generate-001  → predict endpoint
 *  4. imagen-4.0-generate-001       → predict endpoint
 *
 * Each fetch has a 25-second abort timeout so a slow/unreachable API never
 * blocks the job queue indefinitely.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const FETCH_TIMEOUT_MS = 10_000; // 10s per model — fail fast, move on

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

export async function generateGeminiImage(
  prompt: string,
  referenceImage?: string,
): Promise<{ data: Array<{ b64_json?: string }> }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "missing-key") {
    console.warn("[ImageGen] GEMINI_API_KEY not set");
    return { data: [{}] };
  }

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];
  if (referenceImage) {
    const match = referenceImage.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=\r\n]+)$/);
    if (!match) throw new Error("Invalid reference image. Please attach a PNG, JPG, or WebP image.");
    parts.push({ inlineData: { mimeType: match[1].replace("image/jpg", "image/jpeg"), data: match[2].replace(/[\r\n]/g, "") } });
  }

  // ── 1. Gemini native image models (generateContent + responseModalities) ──
  const geminiImageModels = [
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image-preview",
  ];

  for (const model of geminiImageModels) {
    try {
      const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
      const resp = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
      }, referenceImage ? 45_000 : FETCH_TIMEOUT_MS);

      if (!resp.ok) {
        const err = await resp.text();
        console.warn(`[ImageGen] ${model} HTTP ${resp.status}: ${err.slice(0, 200)}`);
        continue;
      }

      const data = await resp.json() as any;
      const responseParts = data.candidates?.[0]?.content?.parts || [];
      const imgPart = responseParts.find((p: any) => p.inlineData?.data);
      if (imgPart?.inlineData?.data) {
        console.log(`[ImageGen] Success: ${model}`);
        return { data: [{ b64_json: imgPart.inlineData.data }] };
      }
      console.warn(`[ImageGen] ${model} returned no inline image data`);
    } catch (err: any) {
      console.warn(`[ImageGen] ${model} error: ${err.message?.slice(0, 150)}`);
    }
  }

  // Imagen's text-only fallback cannot use attachments. Never silently drop a logo.
  if (referenceImage) {
    throw new Error("Image generation with your attachment is temporarily unavailable. Please try again.");
  }

  // ── 2. Imagen 4.0 via predict endpoint ────────────────────────────────────
  const imagenModels = [
    "imagen-4.0-fast-generate-001",
    "imagen-4.0-generate-001",
  ];

  for (const model of imagenModels) {
    try {
      const url = `${GEMINI_BASE}/${model}:predict?key=${apiKey}`;
      const resp = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, outputMimeType: "image/png" },
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        console.warn(`[ImageGen] ${model} HTTP ${resp.status}: ${err.slice(0, 200)}`);
        continue;
      }

      const data = await resp.json() as any;
      console.log(`[ImageGen] ${model} raw keys:`, JSON.stringify(Object.keys(data.predictions?.[0] || {})));

      const pred = data.predictions?.[0];
      const b64 =
        pred?.bytesBase64Encoded ||
        pred?.imageBytes ||
        pred?.image?.imageBytes ||
        pred?.image?.bytesBase64Encoded ||
        null;

      if (b64) {
        console.log(`[ImageGen] Success: ${model}`);
        return { data: [{ b64_json: b64 }] };
      }
      console.warn(`[ImageGen] ${model} returned no image — keys: ${JSON.stringify(pred ? Object.keys(pred) : [])}`);
    } catch (err: any) {
      console.warn(`[ImageGen] ${model} error: ${err.message?.slice(0, 150)}`);
    }
  }

  console.warn("[ImageGen] All models failed — returning empty");
  return { data: [{}] };
}
