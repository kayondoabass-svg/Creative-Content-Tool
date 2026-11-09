export function isPrivateShareKey(key: string) {
  const normalized = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  return /^(?:answer|answers|answer_key|answer_keys|answerkey|answerkeys|correct_answer|correct_answers|correctanswer|correctanswers|answer_explanation|answer_explanations|solution|solutions|key|keys|note|notes|private|private_note|private_notes|privatenote|privatenotes|teacher_answer|teacher_answers|teacher_note|teacher_notes)$/.test(normalized) ||
    /^(?:answer|private|teacher)_(?:answer|answers|key|keys|note|notes|solution|solutions|explanation|explanations)$/.test(normalized) ||
    /(?:^|_)(?:answer_key|answer_keys|correct_answer|teacher_answer|private_note|teacher_note)$/.test(normalized) ||
    /^(?:presenter_notes|presenternotes)$/.test(normalized);
}

/** Read-time protection for old snapshots as well as newly published content. */
export function withoutPrivateShareFields(value: any): any {
  if (Array.isArray(value)) return value.map(withoutPrivateShareFields);
  if (!value || typeof value !== "object") return value;
  const result: Record<string, any> = {};
  for (const [key, item] of Object.entries(value)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) continue;
    if (isPrivateShareKey(key)) {
      if (key === "notes") result.notes = "";
      continue;
    }
    if (key === "body" && typeof item === "string") {
      try { result[key] = JSON.stringify(withoutPrivateShareFields(JSON.parse(item))); continue; } catch { /* plain text */ }
    }
    result[key] = withoutPrivateShareFields(item);
  }
  return result;
}
