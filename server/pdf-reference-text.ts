export interface PdfReferencePage { content: Array<{ str?: unknown }> }

export function collectPdfReferenceText(pages: PdfReferencePage[], maxChars: number) {
  if (!Number.isInteger(maxChars) || maxChars < 1) throw new Error("A positive text limit is required.");
  const chunks: string[] = [];
  let outputLength = 0, emptyPages = 0, truncated = false;
  for (const page of pages) {
    if (!Array.isArray(page?.content)) throw new Error("Invalid PDF page content.");
    let pageHasText = false;
    for (const item of page.content) {
      if (item?.str !== undefined && typeof item.str !== "string") throw new Error("Invalid PDF text.");
      const normalized = (item?.str ?? "").replace(/\s+/g, " ").trim();
      if (!normalized) continue;
      const separator = pageHasText ? " " : outputLength > 0 ? "\n\n" : "";
      pageHasText = true;
      if (truncated) continue;
      const piece = separator + normalized;
      const remaining = maxChars - outputLength;
      if (piece.length <= remaining) {
        chunks.push(piece);
        outputLength += piece.length;
      } else {
        if (remaining > 0) chunks.push(piece.slice(0, remaining));
        outputLength += Math.max(0, remaining);
        truncated = true;
      }
    }
    if (!pageHasText) emptyPages++;
  }
  return {
    text: chunks.join("").trimEnd(), pages: pages.length,
    examinedPages: pages.length, emptyPages, statsComplete: true, truncated,
  };
}
