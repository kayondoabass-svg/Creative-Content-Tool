import type { Lesson } from "./types";
import { lessonFromJSON, MAX_LESSON_FILE, safeName } from "./helpers";
import { lessonBlob } from "./presentation-size";

export type LocalLessonFile = {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void>; abort(): Promise<void> }>;
};
type Pickers = {
  showOpenFilePicker?: (options: unknown) => Promise<LocalLessonFile[]>;
  showSaveFilePicker?: (options: unknown) => Promise<LocalLessonFile>;
};
const types = [{ description: "BrightboardTV lesson", accept: { "application/json": [".bbtv", ".json"] } }];
const pickers = () => window as Window & Pickers;
export function supportsLocalFiles() {
  return !!pickers().showOpenFilePicker && !!pickers().showSaveFilePicker && window.isSecureContext;
}
export async function openLocalLesson() {
  const [handle] = await pickers().showOpenFilePicker!({ multiple: false, types });
  const file = await handle.getFile();
  if (file.size > MAX_LESSON_FILE) throw new Error("Lesson files must be 64 MB or smaller.");
  return { handle, lesson: lessonFromJSON(await file.text()) };
}
export async function writeLessonFile(handle: LocalLessonFile, lesson: Lesson) {
  const body = lessonBlob(lesson);
  if (body.size > MAX_LESSON_FILE) throw new Error("This .bbtv file exceeds the 64 MB limit. Split the presentation before saving a file.");
  const writer = await handle.createWritable();
  try { await writer.write(body); await writer.close(); }
  catch (error) { try { await writer.abort(); } catch { /* preserve the original write error */ } throw error; }
}
export async function chooseLocalLessonFile(lesson: Lesson) {
  return pickers().showSaveFilePicker!({ suggestedName: `${safeName(lesson.title)}.bbtv`, types });
}
