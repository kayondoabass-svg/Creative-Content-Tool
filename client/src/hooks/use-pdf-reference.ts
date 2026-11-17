import { useEffect, useRef, useState } from "react";

type State = {
  status: "idle" | "reading" | "ready" | "confirm" | "error";
  scope: string; name: string; text: string; warnings: string[]; error: string;
};
const empty = (scope: string): State => ({ status: "idle", scope, name: "", text: "", warnings: [], error: "" });

export function usePdfReference(scope: string, onChange?: () => void) {
  const [state, setState] = useState<State>(() => empty(scope));
  const current = useRef(state);
  const activeScope = useRef(scope); activeScope.current = scope;
  const notify = useRef(onChange); notify.current = onChange;
  const sequence = useRef(0);
  const reader = useRef<FileReader | null>(null);
  const request = useRef<AbortController | null>(null);
  const abort = () => {
    sequence.current++;
    reader.current?.abort(); reader.current = null;
    request.current?.abort(); request.current = null;
  };
  const update = (next: State) => { current.current = next; setState(next); };
  useEffect(() => {
    abort(); update(empty(scope));
    return abort;
  }, [scope]);
  const clear = () => { abort(); update(empty(scope)); notify.current?.(); };
  const select = (file: File) => {
    abort();
    notify.current?.();
    const token = sequence.current;
    const owned = () => sequence.current === token && activeScope.current === scope;
    const base = { ...empty(scope), name: file.name };
    const fail = (error: string) => { if (owned()) update({ ...base, status: "error", error }); };
    if (!file.size || file.size > 15 * 1024 * 1024) return fail("Choose a non-empty PDF reference under 15 MB.");
    update({ ...base, status: "reading" });
    const local = new FileReader(); reader.current = local;
    local.onerror = () => fail("This file could not be read from your device.");
    local.onload = async () => {
      if (!owned()) return;
      reader.current = null;
      const controller = new AbortController(); request.current = controller;
      try {
        const response = await fetch("/api/extract-pdf-text", {
          method: "POST", credentials: "include", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfBase64: local.result, filename: file.name }),
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);
        if (!owned()) return;
        if (!response.ok) {
          fail(response.status === 401 ? "Please sign in again to read this reference." :
            typeof data?.error === "string" ? data.error : "The PDF reader could not finish. Please retry.");
          return;
        }
        if (!data || typeof data.text !== "string" || !data.text.trim() || data.text.length > 12_000 ||
            !Number.isInteger(data.pages) || data.pages < 1 || data.pages > 150 ||
            data.examinedPages !== data.pages || !Number.isInteger(data.emptyPages) ||
            data.emptyPages < 0 || data.emptyPages > data.pages || data.statsComplete !== true ||
            typeof data.truncated !== "boolean" || typeof data.materiallyIncomplete !== "boolean" ||
            data.materiallyIncomplete !== (data.truncated || data.emptyPages > 0) ||
            !Array.isArray(data.warnings) || data.warnings.some((v: unknown) => typeof v !== "string")) {
          fail("The PDF reader returned incomplete information. Please retry."); return;
        }
        update({ ...base, status: data.materiallyIncomplete ? "confirm" : "ready", text: data.text, warnings: data.warnings });
      } catch {
        if (!controller.signal.aborted) fail("Connection lost while reading the PDF. Please retry.");
      } finally { if (request.current === controller) request.current = null; }
    };
    try { local.readAsDataURL(file); } catch { fail("The PDF could not be opened on this device."); }
  };
  const visible = state.scope === scope ? state : empty(scope);
  return {
    state: visible, select, clear,
    blocked: !["idle", "ready"].includes(visible.status),
    confirm: () => {
      if (current.current.scope === scope && current.current.status === "confirm") {
        update({ ...current.current, status: "ready" }); notify.current?.();
      }
    },
    resolve: (): { ok: true; text?: string } | { ok: false } => {
      const value = current.current;
      if (value.scope !== scope) return { ok: false };
      if (value.status === "idle") return { ok: true };
      return value.status === "ready" ? { ok: true, text: value.text } : { ok: false };
    },
  };
}
