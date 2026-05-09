/**
 * Gemini image generation via raw REST API — no SDK, no external dependencies.
 * Returns { data: [{ b64_json }] } so all callers work unchanged.
 */

const IMAGE_MODELS = [
  "imagen-3.0-generate-001",
  "gemini-2.0-flash-preview-image-generation",
];

export async function generateGeminiImage(
  prompt: string
): Promise<{ data: Array<{ b64_json?: string }> }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "missing-key") {
    console.warn("[ImageGen] GEMINI_API_KEY not set");
    return { data: [{}] };
  }

  for (const model of IMAGE_MODELS) {
    try {
      const isImagen = model.startsWith("imagen-");
      const endpoint = isImagen
        ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`
        : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const body = isImagen
        ? {
            instances: [{ prompt }],
            parameters: { sampleCount: 1 },
          }
        : {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
          };

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const err = await resp.text();
        console.warn(`[ImageGen] ${model} HTTP ${resp.status}: ${err.slice(0, 200)}`);
        continue;
      }

      const data = await resp.json() as any;

      let b64: string | null = null;
      if (isImagen) {
        b64 = data.predictions?.[0]?.bytesBase64Encoded ?? null;
      } else {
        const parts = data.candidates?.[0]?.content?.parts || [];
        const imgPart = parts.find((p: any) => p.inlineData?.data);
        b64 = imgPart?.inlineData?.data ?? null;
      }

      if (b64) {
        console.log(`[ImageGen] Success: ${model}`);
        return { data: [{ b64_json: b64 }] };
      }
      console.warn(`[ImageGen] ${model} returned no image data`);
    } catch (err: any) {
      console.warn(`[ImageGen] ${model} error: ${err.message?.slice(0, 150)}`);
    }
  }

  console.warn("[ImageGen] All models failed — returning empty");
  return { data: [{}] };
}
