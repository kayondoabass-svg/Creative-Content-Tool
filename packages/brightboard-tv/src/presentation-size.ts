import type { Lesson, StageState } from "./types";

// Keep browser preflight and server enforcement on the same serialized byte limit.
export const MAX_RELAY_BYTES = 12 * 1024 * 1024;
export const MAX_RELAY_ASSET_LENGTH = 8 * 1024 * 1024;
export function hasOversizedRelayAsset(lesson: Lesson): boolean {
  return lesson.pages.some(page => (page.model?.src.length || 0) > MAX_RELAY_ASSET_LENGTH ||
    page.objects.some(object => (object.src?.length || 0) > MAX_RELAY_ASSET_LENGTH));
}
export function serializedBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
export function lessonBlob(lesson: Lesson): Blob {
  return new Blob([JSON.stringify(lesson)], { type: "application/json" });
}
export function presentationSizes(lesson: Lesson, state: StageState) {
  return { file: serializedBytes(lesson), relay: serializedBytes({ ...state, lesson }) };
}
export function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB (${bytes.toLocaleString()} bytes)`;
}
export function assertRelaySize(state: StageState) {
  if (serializedBytes(state) > MAX_RELAY_BYTES)
    throw new Error("Presentation exceeds the 12 MB sharing limit. Open Pair to preview an optimized copy, or download a .bbtv backup. Connected screens keep the last successfully shared version.");
  if (hasOversizedRelayAsset(state.lesson))
    throw new Error("An image or model exceeds the relay's 8 MB encoded-asset limit. Open Pair to optimize images; models must be reduced separately. Your original is unchanged.");
}
