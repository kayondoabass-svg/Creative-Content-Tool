import type { Lesson } from "./types";

export const FREE_PAGE_LIMIT = 10;
export const PAID_PAGE_LIMIT = 20;
// Read older documents without deleting or truncating their pages.
export const LEGACY_PAGE_LIMIT = 60;

export function assertPageLimit(count: number, limit: number) {
  if (count > limit) throw new Error(`This presentation would have ${count} pages, exceeding your ${limit}-page presentation limit (${FREE_PAGE_LIMIT} free / ${PAID_PAGE_LIMIT} paid). Remove pages or split the presentation; no pages have been removed automatically.`);
}

export function replacesEmptyStarter(lesson: Lesson) {
  const page = lesson.pages[0];
  return lesson.pages.length === 1 && page.title === "Welcome" && page.background === "light" &&
    !page.objects.length && !page.ink.length && !page.model && !page.notes.trim();
}
