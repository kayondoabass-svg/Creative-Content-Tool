/**
 * Gemini native image generation service.
 * Returns the same { data: [{ b64_json }] } shape as openai.images.generate
 * so all existing code that reads .data?.[0]?.b64_json works unchanged.
 * Tries multiple models in order, returns empty data on all failures (non-fatal).
 */

const IMAGE_MODELS = [
  "gemini-2.0-flash-preview-image-generation",
  "imagen-3.0-fast-generate-001",
];

async function tryModel(apiKey: string, model: string, prompt: string): Promise<string | null> {
  const isImagen = model.startsWith("imagen-");

  const body = isImagen
    ? JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1 },
      })
    : JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      });

  const endpoint = isImagen
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!response.ok) {
    const err = await response.text();
    console.warn(`[ImageGen] ${model} failed (${response.status}): ${err.slice(0, 200)}`);
    return null;
  }

  const result = await response.json() as any;

  if (isImagen) {
    const b64 = result.predictions?.[0]?.bytesBase64Encoded;
    return b64 ?? null;
  }

  const imagePart = result.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData?.data
  );
  return imagePart?.inlineData?.data ?? null;
}

export async function generateGeminiImage(
  prompt: string
): Promise<{ data: Array<{ b64_json?: string; url?: string }> }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "missing-key") {
    console.warn("[ImageGen] GEMINI_API_KEY not set, skipping image generation");
    return { data: [{}] };
  }

  for (const model of IMAGE_MODELS) {
    try {
      const b64 = await tryModel(apiKey, model, prompt);
      if (b64) {
        console.log(`[ImageGen] Success with model: ${model}`);
        return { data: [{ b64_json: b64 }] };
      }
    } catch (err: any) {
      console.warn(`[ImageGen] ${model} threw: ${err.message}`);
    }
  }

  console.warn("[ImageGen] All models failed — returning empty image");
  return { data: [{}] };
}
