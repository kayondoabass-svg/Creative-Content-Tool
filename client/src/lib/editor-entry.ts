export const EDITOR_WORKSPACE = "/editor/workspace";
const entryKey = "brightboard-editor-entry";

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
  return hasEditorEntry() ? EDITOR_WORKSPACE : "/";
}
