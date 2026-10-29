import type { Lesson } from "./types";
import { validLesson } from "./helpers";

export type ImageOptions = { maxDimension: number; quality: number };
export type ImageEncoder = (src: string, options: ImageOptions) => Promise<string>;

/** Rasterize only embedded still images. WebP retains alpha; GIFs retain animation by being skipped. */
export const compressImage: ImageEncoder = async (src, options) => {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => { image.src = ""; reject(new Error("Image decoding timed out.")); }, 20000);
    image.onload = () => { window.clearTimeout(timeout); resolve(); };
    image.onerror = () => { window.clearTimeout(timeout); reject(new Error("Image could not be decoded.")); };
    image.src = src;
  });
  const scale = Math.min(1, options.maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image optimization is unavailable in this browser.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    // If WebP is unsupported, browsers return PNG. Either is valid and preserves transparency.
    return canvas.toDataURL("image/webp", options.quality);
  } finally { canvas.width = canvas.height = 0; }
};

/** Clone first and change only image sources; never mutate any part of the original. */
export async function optimizeLessonImages(
  original: Lesson,
  options: ImageOptions,
  encode: ImageEncoder = compressImage,
): Promise<{ lesson: Lesson; changed: number; skipped: number }> {
  if (!Number.isInteger(options.maxDimension) || options.maxDimension < 320 || options.maxDimension > 4096 ||
      !Number.isFinite(options.quality) || options.quality < .1 || options.quality > 1)
    throw new Error("Choose an image size from 320 to 4096 pixels and quality from 0.1 to 1.");
  if (!validLesson(original)) throw new Error("The presentation is not valid. No images were changed.");
  const lesson = structuredClone(original);
  const sources = new Map<string, string>();
  let changed = 0, skipped = 0;
  for (const page of lesson.pages) {
    for (const object of page.objects) {
      if (object.type !== "image" || !object.src) continue;
      const src = object.src;
      if (!/^data:image\/(?:png|jpeg|webp);base64,/.test(src)) { skipped++; continue; }
      if (!sources.has(src)) {
        try {
          const candidate = await encode(src, options);
          sources.set(src, /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(candidate) && candidate.length < src.length ? candidate : src);
        } catch { sources.set(src, src); }
      }
      object.src = sources.get(src)!;
      if (object.src !== src) changed++;
      else skipped++;
    }
  }
  if (!validLesson(lesson)) throw new Error("The optimized copy failed validation. Your original has not changed.");
  return { lesson, changed, skipped };
}
