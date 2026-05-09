/**
 * Gemini native image generation service using @google/genai SDK.
 * Returns { data: [{ b64_json }] } shape so all existing callers work unchanged.
 * Tries gemini-2.0-flash-preview-image-generation first, falls back to imagen-3.
 */
import { GoogleGenAI } from "@google/genai";

const IMAGE_MODELS = [
  "imagen-3.0-generate-001",
  "gemini-2.0-flash-preview-image-generation",
];

export async function generateGeminiImage(
  prompt: string
): Promise<{ data: Array<{ b64_json?: string; url?: string }> }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "missing-key") {
    console.warn("[ImageGen] GEMINI_API_KEY not set, skipping");
    return { data: [{}] };
  }

  const genAI = new GoogleGenAI({ apiKey });

  for (const model of IMAGE_MODELS) {
    try {
      const isImagen = model.startsWith("imagen-");

      let b64: string | null = null;

      if (isImagen) {
        // Imagen uses generateImages
        const result = await (genAI.models as any).generateImages({
          model,
          prompt,
          config: { numberOfImages: 1, outputMimeType: "image/png" },
        });
        b64 = result.generatedImages?.[0]?.image?.imageBytes ?? null;
      } else {
        // Gemini image generation model
        const result = await genAI.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { responseModalities: ["IMAGE", "TEXT"] } as any,
        });
        const imagePart = result.candidates?.[0]?.content?.parts?.find(
          (p: any) => p.inlineData?.data
        );
        b64 = imagePart?.inlineData?.data ?? null;
      }

      if (b64) {
        console.log(`[ImageGen] Success with model: ${model}`);
        return { data: [{ b64_json: b64 }] };
      }
      console.warn(`[ImageGen] ${model} returned no image data`);
    } catch (err: any) {
      console.warn(`[ImageGen] ${model} failed: ${err.message?.slice(0, 150)}`);
    }
  }

  console.warn("[ImageGen] All models failed — returning empty");
  return { data: [{}] };
}
