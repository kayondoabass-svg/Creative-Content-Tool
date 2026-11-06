export const EDITOR_WORKSPACE = "/editor/workspace";
const entryKey = "brightboard-editor-entry";
const returnKey = "brightboard-auth-return";

export function rememberAuthReturn(path: string) {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return;
  try { sessionStorage.setItem(returnKey, JSON.stringify({ path, at: Date.now() })); } catch { /* Query-string return remains usable. */ }
}
export function pendingAuthReturn(): string | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(returnKey) || "null");
    if (saved && typeof saved.path === "string" && saved.path.startsWith("/") && !saved.path.startsWith("//") && !saved.path.includes("\\") && Date.now() - saved.at < 60 * 60 * 1000) return saved.path;
  } catch { /* Invalid or unavailable session storage. */ }
  return hasEditorEntry() ? EDITOR_WORKSPACE : null;
}
export function clearAuthReturn() {
  clearEditorEntry();
  try { sessionStorage.removeItem(returnKey); } catch { /* Nothing to clear. */ }
}

export function rememberEditorEntry() {
  try { sessionStorage.setItem(entryKey, String(Date.now())); } catch { /* URL redirect still works without storage. */ }
}

export function hasEditorEntry() {
  try {
    const saved = Number(sessionStorage.getItem(entryKey));
    return saved > 0 && Date.now() - saved < 30 * 60 * 1000;
  } catch { return false; }
}

export function clearEditorEntry() {
  try { sessionStorage.removeItem(entryKey); } catch { /* No stored intent to clear. */ }
}

export function loginDestination() {
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  if (redirect?.startsWith("/") && !redirect.startsWith("//") && !redirect.includes("\\")) {
    return redirect;
  }
  return pendingAuthReturn() || "/";
}
