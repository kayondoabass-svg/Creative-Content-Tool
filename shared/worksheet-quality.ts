/** Construct puzzles in code, never ask an image model to draw their letters. */
export function buildWordSearch(words: unknown) {
  if (!Array.isArray(words)) throw new Error("A word search needs a word list.");
  const unique = Array.from(new Set(words.map(w => String(w).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "")).filter(Boolean)));
  if (unique.length < 3 || unique.length > 20 || unique.some(w => w.length < 2 || w.length > 20)) {
    throw new Error("Choose 3–20 distinct words, each containing 2–20 letters.");
  }
  const size = Math.max(10, unique.length, ...unique.map(w => w.length));
  const grid = Array.from({ length: size }, () => Array(size).fill(""));
  // One shuffled row per word guarantees placement even with long vocabulary.
  const rows = Array.from({ length: size }, (_, i) => i);
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  const placements = unique.map((word, i) => {
    const row = rows[i], column = Math.floor(Math.random() * (size - word.length + 1));
    Array.from(word).forEach((letter, offset) => { grid[row][column + offset] = letter; });
    return { word, row, column, direction: "right" };
  });
  for (const row of grid) for (let i = 0; i < row.length; i++) if (!row[i]) row[i] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return { words: unique, grid, answerKey: placements };
}

export function validateWorksheet(data: any) {
  if (!data || typeof data.title !== "string" || !data.title.trim()) throw new Error("Worksheet title is missing.");
  const layout = data.layout || "mixed";
  const key = ({ pictureGrid: "questions", fillBlank: "questions", multipleChoice: "questions", matching: "pairs", trueOrFalse: "statements", writing: "prompts", mixed: "sections", wordSearch: "words" } as Record<string, string>)[layout];
  if (!key || !Array.isArray(data[key]) || !data[key].length) throw new Error("Worksheet has no valid exercises.");
  const seen = new Set<string>();
  for (const item of data[key]) {
    const text = typeof item === "string" ? item : item.question ?? item.text ?? item.textBeforeBlank ?? item.left ?? item.title ?? JSON.stringify(item.content);
    if (typeof text !== "string" || !text.trim()) throw new Error("An exercise is empty.");
    const normalized = text.trim().toLowerCase();
    if (seen.has(normalized)) throw new Error("The worksheet repeats an exercise.");
    seen.add(normalized);
    if (layout === "multipleChoice") {
      if (!Array.isArray(item.options) || item.options.length < 2 || new Set(item.options).size !== item.options.length ||
          !/^[A-D]$/.test(item.answer) || item.answer.charCodeAt(0) - 65 >= item.options.length) throw new Error("A multiple-choice answer is invalid.");
    }
    if (["fillBlank", "pictureGrid"].includes(layout) && (typeof item.answer !== "string" || !item.answer.trim())) throw new Error("An exercise has no answer.");
    if (layout === "matching" && (typeof item.right !== "string" || !item.right.trim())) throw new Error("A matching pair is incomplete.");
    if (layout === "trueOrFalse" && typeof item.answer !== "boolean") throw new Error("A true/false answer is invalid.");
    if (layout === "mixed" && (!Array.isArray(item.content) || !item.content.length || item.content.some((v: any) => typeof v !== "string" || !v.trim()))) throw new Error("A worksheet section is incomplete.");
  }
  return data;
}

/** Student-only text is also the source for export; answer keys stay separate. */
export function worksheetLines(data: any, includeAnswers = false): string[] {
  // Old documents remain exportable even if they predate stricter generation
  // checks. Never modify the saved original or silently "repair" its answers.
  if (!data || typeof data !== "object" || !data.title) throw new Error("Worksheet data is missing.");
  const lines = [String(data.title), data.instructions || "", ""];
  if (data.layout === "wordSearch") {
    lines.push(...data.grid.map((row: string[]) => row.join("  ")), "", `Find: ${data.words.join(", ")}`);
  } else if (data.questions) {
    data.questions.forEach((q: any, i: number) => {
      lines.push(`${i + 1}. ${q.question || `${q.textBeforeBlank || ""} _______ ${q.textAfterBlank || ""}`}`);
      if (q.options) lines.push(Array.isArray(q.options) ? q.options.join("    ") : q.options);
      lines.push("");
    });
  } else if (data.pairs) {
    // Deterministic rotation: does not change every time React rerenders.
    data.pairs.forEach((p: any, i: number) => lines.push(`${i + 1}. ${p.left}                 ${String.fromCharCode(65 + i)}. ${data.pairs[(i + 1) % data.pairs.length].right}`));
  } else if (data.statements) {
    data.statements.forEach((q: any, i: number) => lines.push(`${i + 1}. ${q.text}   True / False`, ""));
  } else if (data.prompts) {
    data.prompts.forEach((q: any, i: number) => lines.push(`${i + 1}. ${q.text}`, ...Array(Math.min(8, Math.max(2, q.lines || 4))).fill("________________________________________________")));
  } else {
    data.sections.forEach((s: any) => {
      lines.push(s.title || "", ...s.content.map((v: string, i: number) => `${i + 1}. ${v}`), "");
      if (includeAnswers && s.answers?.length) {
        lines.push("Answer Key:", ...s.answers.map((answer: string, i: number) => `${i + 1}. ${answer}`), "");
      }
    });
  }
  return lines;
}
