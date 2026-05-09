/**
 * Gemini image generation via raw REST API — no SDK, no external dependencies.
 * Returns { data: [{ b64_json }] } so all callers work unchanged.
 *
 * Strategy (in order):
 *  1. gemini-2.5-flash-image  → generateContent with responseModalities IMAGE
 *  2. gemini-3.1-flash-image-preview → same
 *  3. imagen-4.0-fast-generate-001  → predict endpoint
 *  4. imagen-4.0-generate-001       → predict endpoint
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export async function generateGeminiImage(
  prompt: string
): Promise<{ data: Array<{ b64_json?: string }> }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "missing-key") {
    console.warn("[ImageGen] GEMINI_API_KEY not set");
    return { data: [{}] };
  }

  // ── 1. Gemini native image models (generateContent + responseModalities) ──
  const geminiImageModels = [
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image-preview",
  ];

  for (const model of geminiImageModels) {
    try {
      const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        console.warn(`[ImageGen] ${model} HTTP ${resp.status}: ${err.slice(0, 200)}`);
        continue;
      }

      const data = await resp.json() as any;
      const parts = data.candidates?.[0]?.content?.parts || [];
      const imgPart = parts.find((p: any) => p.inlineData?.data);
      if (imgPart?.inlineData?.data) {
        console.log(`[ImageGen] Success: ${model}`);
        return { data: [{ b64_json: imgPart.inlineData.data }] };
      }
      console.warn(`[ImageGen] ${model} returned no inline image data`);
    } catch (err: any) {
      console.warn(`[ImageGen] ${model} error: ${err.message?.slice(0, 150)}`);
    }
  }

  // ── 2. Imagen 4.0 via predict endpoint ────────────────────────────────────
  const imagenModels = [
    "imagen-4.0-fast-generate-001",
    "imagen-4.0-generate-001",
  ];

  for (const model of imagenModels) {
    try {
      const url = `${GEMINI_BASE}/${model}:predict?key=${apiKey}`;
      const resp = await fetch(url, {
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

      // Try all known field names across API versions
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
