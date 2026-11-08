import { buildWordSearch, validateWorksheet } from "../shared/worksheet-quality";

/** Layout is a user selection, not a field the reviewer is allowed to change. */
export function checkedWorksheetReview(value: any, layout: string, colorMode: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The worksheet review did not return an object.");
  }
  const worksheet = { ...value, layout, colorMode };
  // Validate the actual exercise structure, not an unreliable AI layout label.
  // Relabelling a matching worksheet as mixed cannot pass the sections check.
  if (layout === "wordSearch") Object.assign(worksheet, buildWordSearch(value.words));
  validateWorksheet(worksheet);
  return worksheet;
}

export async function reviewWorksheet(
  layout: string,
  colorMode: string,
  review: (previousError?: string) => Promise<unknown>,
) {
  let previousError: string | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await review(previousError);
      return checkedWorksheetReview(response, layout, colorMode);
    } catch (error) {
      previousError = error instanceof Error ? error.message : "Incomplete worksheet structure.";
    }
  }
  // Never save a blank scaffold or quietly substitute an unreviewed original.
  throw new Error("Worksheet checking could not complete after a repair attempt. Your selected worksheet type has not changed. Please try again.");
}
