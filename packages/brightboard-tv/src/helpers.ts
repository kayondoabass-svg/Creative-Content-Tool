import type { Lesson, Page, StageState } from "./types";
import { initialState, newLesson } from "./types";

export const MAX_FILE = 25 * 1024 * 1024;
const unit = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;
const embeddedAsset = (src: unknown, pattern: RegExp) => typeof src === "string" && pattern.test(src) && dataUrlBytes(src) <= MAX_FILE;
export function validLesson(value: unknown): value is Lesson {
  if (!value || typeof value !== "object") return false;
  const x = value as Lesson;
  return x.format === "brightboard-tv" && x.version === 1 && typeof x.id === "string" && typeof x.title === "string" &&
    x.title.length > 0 && x.title.length <= 200 && typeof x.updatedAt === "string" && Array.isArray(x.pages) && x.pages.length > 0 && x.pages.length <= 60 &&
    x.pages.every((p: Page) => p && typeof p.id === "string" && typeof p.title === "string" && p.title.length <= 200 &&
      ["light", "dark", "lined", "grid"].includes(p.background) && Array.isArray(p.ink) && p.ink.length <= 2000 &&
      p.ink.every(s => s && typeof s.id === "string" && /^#[\da-f]{6}$/i.test(s.color) && Number.isFinite(s.width) && s.width >= .1 && s.width <= 100 &&
        Array.isArray(s.points) && s.points.length <= 10000 && s.points.every(pt => pt && unit(pt.x) && unit(pt.y))) &&
      Array.isArray(p.objects) && p.objects.length <= 1000 && p.objects.every(o => o && typeof o.id === "string" &&
        ["text", "image", "rect", "ellipse", "line", "arrow"].includes(o.type) && unit(o.x) && unit(o.y) &&
        typeof o.width === "number" && Number.isFinite(o.width) && o.width >= 0 && o.width <= 1 &&
        typeof o.height === "number" && Number.isFinite(o.height) && o.height >= 0 && o.height <= 1 &&
        /^#[\da-f]{6}$/i.test(o.color) && (o.type !== "image" || embeddedAsset(o.src, /^data:image\/(?:png|jpeg|webp);base64,/)) &&
        (o.fontSize === undefined || Number.isFinite(o.fontSize)) && (o.text === undefined || typeof o.text === "string")) &&
      typeof p.notes === "string" && p.notes.length <= 20000 &&
      (p.model === undefined || (p.model && typeof p.model.src === "string" &&
        (/^\/tv-assets\/models\/[a-z0-9-]+\.glb$/.test(p.model.src) || embeddedAsset(p.model.src, /^data:model\/gltf-binary;base64,/)) &&
        typeof p.model.name === "string" && typeof p.model.attribution === "string" && typeof p.model.license === "string" &&
        Array.isArray(p.model.hotspots) && p.model.hotspots.length <= 100 &&
        p.model.hotspots.every(h => h && typeof h.id === "string" && typeof h.label === "string" && typeof h.description === "string" && typeof h.position === "string" && typeof h.normal === "string"))));
}
export function lessonFromJSON(input: string): Lesson {
  const value = JSON.parse(input);
  if (!validLesson(value)) throw new Error("This file is not a valid BrightboardTV lesson.");
  return value;
}
export function stageFor(lesson: Lesson): StageState { return initialState(lesson); }
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function safeName(name: string) { return name.trim().replace(/[^\w\-]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "presentation"; }
export function dataUrlBytes(data: string) { return Math.ceil((data.split(",")[1]?.length || 0) * .75); }
export function fileToDataUrl(file: File): Promise<string> {
  if (file.size > MAX_FILE) return Promise.reject(new Error("File is larger than 25 MB. Choose a smaller file."));
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Could not read this file."));
    reader.readAsDataURL(file);
  });
}
export async function fileToModelDataUrl(file: File): Promise<string> {
  if (file.size > MAX_FILE) throw new Error("Model must be 25 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:model/gltf-binary;base64,${btoa(binary)}`;
}
export function freshLesson() { return newLesson(); }
