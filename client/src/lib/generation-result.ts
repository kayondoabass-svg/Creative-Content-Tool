export function acceptGenerationResult(value: any, ownerId: string, type: string) {
  if (!value || value.userId !== ownerId || value.type !== type ||
      !Number.isInteger(value.id) || value.id < 1 ||
      typeof value.title !== "string" || !value.title.trim() ||
      typeof value.content !== "string" || !value.content.trim()) {
    throw new Error("The server did not return a valid result for this request. No previous document was substituted.");
  }
  let parsed;
  try { parsed = JSON.parse(value.content); } catch { throw new Error("The generated document could not be read. Please retry."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("The generated document is incomplete. Please retry.");
  return value;
}
