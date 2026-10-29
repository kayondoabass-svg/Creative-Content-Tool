import type { Lesson } from "./types";

export const FREE_PAGE_LIMIT = 20;
export const PAID_PAGE_LIMIT = 50;
export const BUSINESS_PAGE_LIMIT = 100;
export const PAGE_LIMIT_DESCRIPTION = "20 free / 50 standard / 100 business";
export function verifiedPageLimit(value: unknown) {
  return value === PAID_PAGE_LIMIT || value === BUSINESS_PAGE_LIMIT ? value : FREE_PAGE_LIMIT;
}
// Read older documents without deleting or truncating their pages.
export const LEGACY_PAGE_LIMIT = BUSINESS_PAGE_LIMIT;

export function assertPageLimit(count: number, limit: number) {
  if (!Number.isSafeInteger(count) || count < 1 || count > limit) throw new Error(`This presentation would have ${count} pages, exceeding your ${limit}-page presentation limit (${PAGE_LIMIT_DESCRIPTION}). Remove pages or split the presentation; no pages have been removed automatically.`);
}

export function replacesEmptyStarter(lesson: Lesson) {
  const page = lesson.pages[0];
  return lesson.pages.length === 1 && page.title === "Welcome" && page.background === "light" &&
    !page.objects.length && !page.ink.length && !page.model && !page.notes.trim();
}
