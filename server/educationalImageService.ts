import type { ImageOptions } from "../shared/schema";
import { generateGeminiImage } from "./geminiImageService";
import { compositeExactLogo, composeImageGrid, prepareExactLogo, resolveLogoPosition } from "./exactLogoService";

export async function generateEducationalImage(
  prompt: string,
  context: string,
  title: string,
  options: ImageOptions = {},
  referenceImage?: string,
  generate = generateGeminiImage,
) {
  const { style = "animation", quality = "2d", layout = "single" } = options;
  const exact = options.logoMode === "exact";
  const logo = exact ? await prepareExactLogo(referenceImage) : undefined;
  const position = resolveLogoPosition(prompt, options.logoPosition);
  const styleDesc = style === "animation" ? "cartoon-like, animated style" : "realistic, photorealistic style";
  const qualityDesc = quality === "4k" ? "ultra high quality, 4K resolution"
    : quality === "hd" ? "high definition, crisp details"
    : quality === "3d" ? "3D rendered, dimensional" : "2D flat illustration";
  const attachmentInstructions = exact
    ? `LOGO HANDLING OVERRIDE: The uploaded logo will be added separately by software, at ${position}, approximately ${options.logoWidthPercent ?? 20}% of canvas width with ${options.logoMarginPercent ?? 4}% edge margins. Leave quiet space there. Do NOT draw, recreate, imitate, or add any logo, brand mark, placeholder box, or logo lettering, even if the user's prompt requests a logo. Generate only the underlying design.`
    : referenceImage
      ? "Use the attached image as directed by the user's prompt. If it is a logo, preserve its design, colors, proportions, and lettering faithfully and place it at the position requested. Do not omit the attachment. Keep any requested text and logo lettering legible."
      : "No text in the image.";
  const enhancedPrompt = `Create a colorful, child-friendly educational illustration: ${prompt}. ${context} Style: bright colors, simple shapes, ${styleDesc}, ${qualityDesc}, engaging for children. ${attachmentInstructions}`;
  const images: string[] = [];
  for (let i = 0; i < (layout === "grid" ? 4 : 1); i++) {
    // Exact mode deliberately never sends the original logo to the model.
    const response = await generate(
      `${enhancedPrompt}${layout === "grid" ? ` (variation ${i + 1})` : ""}`,
      exact ? undefined : referenceImage,
    );
    const image = response.data?.[0]?.b64_json;
    if (!image) throw new Error("Image generation is temporarily unavailable. Please try again in a moment.");
    images.push(logo ? await compositeExactLogo(image, logo, options, position) : image);
  }
  return {
    title,
    description: prompt,
    b64_json: layout === "grid" ? await composeImageGrid(images) : images[0],
    ...(layout === "grid" ? { images } : {}),
    options: { ...options, style, quality, layout, ...(exact ? { resolvedLogoPosition: position } : {}) },
  };
}
