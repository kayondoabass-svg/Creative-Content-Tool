import type { ImageOptions } from "../shared/schema";
import { generateGeminiImage } from "./geminiImageService";
import { compositeExactLogo, composeImageGrid, prepareExactLogo, resolveLogoPosition } from "./exactLogoService";
import { verifyImageResult } from "./reference-input";

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
      ? "Apply the user's requested reference purpose and changes. Do not treat a reference worksheet as a logo or return a copy. Preserve a logo only when explicitly requested."
      : "Avoid decorative or invented text. Include readable educational labels only when requested.";
  const enhancedPrompt = `Create a NEW educational illustration following the user's instructions: ${prompt}. ${context} Style: ${styleDesc}, ${qualityDesc}. Adapt to the requested audience; do not override explicit requests with a generic child-friendly style. ${attachmentInstructions} Never copy malformed sentences or puzzle grids from a reference. Do not present image-generated puzzle lettering as a verified solvable exercise; use clear subject illustrations and requested labels. Each output must be one composition, not a collage of the reference.`;
  const images: string[] = [];
  const backgrounds: string[] = [];
  const deadline = Date.now() + 150_000;
  for (let i = 0; i < (layout === "grid" ? 4 : 1); i++) {
    if (Date.now() >= deadline) throw new Error("Image creation timed out. No incomplete grid was saved. Please try a single image.");
    // Exact mode deliberately never sends the original logo to the model.
    const response = await generate(
      `${enhancedPrompt}${layout === "grid" ? `\nVariation ${i + 1} of 4: use a distinct composition and focal subject. Direction: ${["wide contextual scene", "close-up of a key subject with a different arrangement", "action scene with a new viewpoint", "contrasting composition with different supporting details"][i]}. Follow any user-specified variation instead. Do not duplicate the reference or previous panel.` : ""}`,
      exact ? undefined : referenceImage,
      deadline,
    );
    const image = response.data?.[0]?.b64_json;
    if (!image) throw new Error("Image generation is temporarily unavailable. Please try again in a moment.");
    await verifyImageResult(image, exact ? undefined : referenceImage, exact ? backgrounds : images);
    if (exact) backgrounds.push(image);
    images.push(logo ? await compositeExactLogo(image, logo, options, position) : image);
  }
  return {
    title,
    description: prompt,
    b64_json: layout === "grid" ? await composeImageGrid(images) : images[0],
    ...(layout === "grid" ? { images } : {}),
    options: { ...options, style, quality, layout, ...(exact ? { resolvedLogoPosition: position } : {}) },
    ...(exact ? { logoSources: { backgrounds, logo: referenceImage! } } : {}),
  };
}
