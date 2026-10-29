import { lessonFromJSON, MAX_LESSON_FILE } from "./helpers";
import type { Lesson } from "./types";

export type CloudLesson = { id: string; title: string; pageCount: number; bytes: number; updatedAt: string; revision: string };
export type CloudLibrary = { lessons: CloudLesson[]; usage: { lessons: number; bytes: number }; limits: { maxLessons: number; maxBytes: number; maxLessonBytes: number } };
export class CloudLibraryError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function libraryRequest<T>(path = "", init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/tv/library${path}`, {
      ...init, credentials: "include", cache: "no-store", signal: AbortSignal.timeout(90_000),
      headers: { Accept: "application/json", ...init.headers },
    });
  } catch {
    throw new CloudLibraryError(0, "Could not confirm the account request: offline or timed out. Your device copy is unchanged. Download a .bbtv backup, reconnect and refresh the library before retrying.");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new CloudLibraryError(response.status, data?.error || "Account library could not be reached. Your device copy is unchanged. Download a .bbtv backup and retry online.");
  }
  return response.status === 204 ? undefined as T : response.json();
}
export async function openCloudLesson(id: string): Promise<{ lesson: Lesson; revision: string }> {
  const result = await libraryRequest<{ lesson: unknown; revision: string }>(`/${encodeURIComponent(id)}`);
  return { lesson: lessonFromJSON(JSON.stringify(result.lesson)), revision: result.revision };
}
export async function saveCloudLesson(lesson: Lesson, revision?: string) {
  const body = JSON.stringify(lesson);
  if (new Blob([body]).size > MAX_LESSON_FILE) throw new Error("Lesson is larger than 64 MB. Download a backup and reduce embedded assets.");
  return libraryRequest<CloudLesson>(`/${encodeURIComponent(lesson.id)}`, { method: "PUT", body,
    headers: { "Content-Type": "application/json", ...(revision ? { "If-Match": revision } : {}) } });
}
