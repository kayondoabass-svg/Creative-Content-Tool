import sharp from "sharp";
import type { ImageOptions } from "../shared/schema";

type LogoPosition = Exclude<ImageOptions["logoPosition"], "auto" | undefined>;

// Resolve explicit UI choices first. Auto recognises common position instructions;
// ambiguous or absent placement instructions use the documented top-right default.
export function resolveLogoPosition(prompt: string, requested?: ImageOptions["logoPosition"]): LogoPosition {
  if (requested && requested !== "auto") return requested;
  const text = prompt.toLowerCase().replace(/[–—_-]/g, " ");
  const horizontal = "(left|right|cent(?:er|re)|middle)";
  const vertical = "(top|bottom|upper|lower)";
  const placements = Array.from(text.matchAll(new RegExp(
    `\\b(?:${vertical}\\s+(?:at\\s+the\\s+|in\\s+the\\s+)?${horizontal}|${horizontal}\\s+${vertical})\\b`, "g",
  )));
  const logoMentions = Array.from(text.matchAll(/\b(?:logo|brand mark)\b/g));
  // Prefer the position nearest the logo instruction over unrelated scene
  // positions (e.g. "sun top left, logo bottom right").
  const distance = (candidate: RegExpMatchArray) => Math.min(...logoMentions.map(logo =>
    Math.abs(candidate.index! - logo.index!)));
  if (logoMentions.length) placements.sort((a, b) => distance(a) - distance(b));
  const match = placements[0];
  if (match) {
    const words = match[0];
    const row = /top|upper/.test(words) ? "top" : "bottom";
    const col = /left/.test(words) ? "left" : /right/.test(words) ? "right" : "center";
    return `${row}-${col}` as LogoPosition;
  }
  const side = text.match(/\b(?:center|centre|middle)\s+(left|right)\b|\b(left|right)\s+(?:center|centre|middle)\b/);
  if (side) {
    return `center-${side[1] || side[2]}` as LogoPosition;
  }
  // A bare centre/left/right instruction is interpreted only near a logo mention.
  const logoPlacement = text.match(/\b(?:logo|brand mark)\b[^.!?\n]{0,65}/)?.[0] || "";
  if (/\b(?:center|centre|middle)\b/.test(logoPlacement)) return "center";
  if (/\b(?:bottom|lower)\b/.test(logoPlacement)) return "bottom-center";
  if (/\b(?:top|upper)\b/.test(logoPlacement)) return "top-center";
  if (/\bleft\b/.test(logoPlacement)) return "center-left";
  if (/\bright\b/.test(logoPlacement)) return "center-right";
  return "top-right";
}

export async function prepareExactLogo(referenceImage: string | undefined): Promise<Buffer> {
  const match = referenceImage?.match(/^data:image\/(?:png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match) throw new Error("Exact-logo mode requires a PNG, JPG, or WebP logo.");
  const input = Buffer.from(match[1], "base64");
  if (input.length > 10 * 1024 * 1024) throw new Error("Logo too large. Please use an image under 10MB.");
  try {
    // Decode before spending a generation credit; limit decompression and freeze
    // animated inputs to a single frame. No trimming/background removal/recolouring.
    const image = sharp(input, { limitInputPixels: 16_000_000, animated: false });
    const metadata = await image.metadata();
    if (!["png", "jpeg", "webp"].includes(metadata.format || "")) throw new Error("Unsupported logo format");
    return await image.rotate().png().toBuffer();
  } catch {
    throw new Error("Could not read this logo. Please upload a valid PNG, JPG, or WebP image up to 16 megapixels.");
  }
}

export async function compositeExactLogo(
  generatedBase64: string,
  logo: Buffer,
  options: ImageOptions,
  position: LogoPosition,
): Promise<string> {
  const base = Buffer.from(generatedBase64, "base64");
  const { width, height } = await sharp(base).metadata();
  if (!width || !height) throw new Error("The generated image could not be read.");
  const marginPercent = options.logoMarginPercent ?? 4;
  const marginX = Math.round(width * marginPercent / 100);
  const marginY = Math.round(height * marginPercent / 100);
  const targetWidth = Math.max(1, Math.min(width - 2 * marginX, Math.round(width * (options.logoWidthPercent ?? 20) / 100)));
  // The height bound keeps very tall logos entirely on the canvas.
  const resized = await sharp(logo).resize({
    width: targetWidth, height: Math.max(1, height - 2 * marginY), fit: "inside",
  }).png().toBuffer({ resolveWithObject: true });
  const left = position.endsWith("left") ? marginX
    : position.endsWith("right") ? width - marginX - resized.info.width
    : Math.round((width - resized.info.width) / 2);
  const top = position.startsWith("top") ? marginY
    : position.startsWith("bottom") ? height - marginY - resized.info.height
    : Math.round((height - resized.info.height) / 2);
  return (await sharp(base).composite([{ input: resized.data, left, top }]).png().toBuffer()).toString("base64");
}

// Download the complete grid, not just its first variation.
export async function composeImageGrid(images: string[]): Promise<string> {
  if (images.length !== 4) throw new Error("Could not generate all four images. Please try again.");
  const tiles = images.map(image => Buffer.from(image, "base64"));
  const metadata = await Promise.all(tiles.map(tile => sharp(tile).metadata()));
  const width = Math.max(...metadata.map(meta => meta.width || 0));
  const height = Math.max(...metadata.map(meta => meta.height || 0));
  if (!width || !height || width * height * 4 > 64_000_000) throw new Error("Generated grid dimensions are too large.");
  // Preserve each finished tile at its native resolution in the download.
  return (await sharp({ create: { width: width * 2, height: height * 2, channels: 4, background: "#ffffff" } })
    .composite(tiles.map((input, index) => ({
      input,
      left: (index % 2) * width + Math.floor((width - metadata[index].width!) / 2),
      top: Math.floor(index / 2) * height + Math.floor((height - metadata[index].height!) / 2),
    })))
    .png().toBuffer()).toString("base64");
}
