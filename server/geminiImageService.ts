/**
 * Gemini native image generation service.
 * Returns the same { data: [{ b64_json }] } shape as openai.images.generate
 * so all existing code that reads .data?.[0]?.b64_json works unchanged.
 */
export async function generateGeminiImage(
  prompt: string
): Promise<{ data: Array<{ b64_json?: string; url?: string }> }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("Gemini image generation error:", err);
    throw new Error(`Gemini image generation failed (${response.status}): ${err}`);
  }

  const result = await response.json() as any;
  const imagePart = result.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData?.data
  );
  const b64_json: string | undefined = imagePart?.inlineData?.data ?? undefined;

  return { data: [{ b64_json }] };
}
