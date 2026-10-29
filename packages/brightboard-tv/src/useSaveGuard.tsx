import { useCallback, useEffect, useRef, useState } from "react";
import type { Lesson } from "./types";
import { workspaceStorage } from "./workspace-storage";
import { downloadBlob, safeName } from "./helpers";
import { lessonBlob } from "./presentation-size";

/** Only committed snapshots count as saved. Lifecycle events cannot await storage. */
export function useSaveGuard(lesson: Lesson, editor: boolean, localStale: boolean, localBusy: boolean, saveLocal: () => Promise<boolean>) {
  const latest = useRef(lesson);
  latest.current = lesson;
  const [status, setStatus] = useState<"saving" | "saved" | "error">(() => workspaceStorage.workspace() === lesson ? "saved" : "saving");
  const timer = useRef<number | undefined>();
  const stopDebounce = useCallback(() => window.clearTimeout(timer.current), []);
  const inFlight = useRef<{ snapshot: Lesson; promise: Promise<boolean> } | null>(null);
  const bypass = useRef(false);
  const [request, setRequest] = useState<((leave: boolean) => void) | null>(null);
  const pendingRequest = useRef<((leave: boolean) => void) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [exported, setExported] = useState<Lesson | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const flush = useCallback((): Promise<boolean> => {
    window.clearTimeout(timer.current);
    const snapshot = latest.current;
    if (inFlight.current?.snapshot === snapshot) return inFlight.current.promise;
    if (workspaceStorage.workspace() === snapshot && !inFlight.current) {
      setStatus("saved");
      return Promise.resolve(true);
    }
    setStatus("saving");
    const promise = workspaceStorage.saveWorkspace(snapshot).then(() => {
      if (latest.current === snapshot) setStatus("saved");
      return true;
    }, () => {
      if (latest.current === snapshot) setStatus("error");
      return false;
    }).finally(() => {
      if (inFlight.current?.promise === promise) inFlight.current = null;
    });
    inFlight.current = { snapshot, promise };
    return promise;
  }, []);
  useEffect(() => {
    if (!editor) return;
    setStatus(workspaceStorage.workspace() === lesson ? "saved" : "saving");
    timer.current = window.setTimeout(() => void flush(), 300);
    return stopDebounce;
  }, [lesson, editor, flush, stopDebounce]);
  const unsafe = editor && (workspaceStorage.workspace() !== lesson || status !== "saved" || localStale || localBusy);
  const unsafeNow = useRef(unsafe);
  unsafeNow.current = unsafe;
  const guard = useCallback((): Promise<boolean> => {
    if (!unsafeNow.current) return Promise.resolve(true);
    if (pendingRequest.current) return Promise.resolve(false);
    setError(""); setExported(null);
    return new Promise(resolve => {
      pendingRequest.current = resolve;
      setRequest(() => resolve);
    });
  }, []);
  const finish = (leave: boolean) => {
    pendingRequest.current?.(leave);
    pendingRequest.current = null;
    setRequest(null);
  };
  useEffect(() => {
    if (!editor) return;
    const hidden = () => { if (document.visibilityState === "hidden") void flush(); };
    const pagehide = () => { void flush(); };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", pagehide);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", pagehide);
    };
  }, [editor, flush]);
  useEffect(() => {
    if (!unsafe) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (bypass.current) return;
      void flush();
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [unsafe, flush]);
  useEffect(() => {
    if (!editor) return;
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
          (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download") || !unsafe) return;
      event.preventDefault();
      event.stopPropagation();
      void guard().then(leave => {
        if (!leave) return;
        bypass.current = true;
        window.location.assign(anchor.href);
        // If a browser blocks the navigation, don't disable future protection.
        window.setTimeout(() => { bypass.current = false; }, 1000);
      });
    };
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, [editor, unsafe, guard]);
  useEffect(() => {
    if (!request) return;
    const previous = document.activeElement as HTMLElement | null;
    cancel.current?.focus();
    return () => previous?.focus();
  }, [request]);
  const dialog = request && <div className="modal-backdrop" style={{ zIndex: 110 }} onKeyDown={event => {
    if (event.key === "Escape" && !busy) { event.stopPropagation(); finish(false); }
    if (event.key === "Tab") {
      const buttons = panel.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!buttons?.length) { event.preventDefault(); return; }
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }}>
    <div className="modal" ref={panel} role="alertdialog" aria-modal="true" aria-labelledby="save-guard-title" aria-describedby="save-guard-description">
      <h2 id="save-guard-title">Keep your latest work before leaving</h2>
      <p id="save-guard-description">{status !== "saved" ? "Your latest browser draft is still saving or could not be saved. " : "Your browser draft is saved. "}
        {localStale ? "The linked local file is out of date. Saving a browser draft does not update that file. " : ""}
        {localBusy ? "A local-file save is still running. " : ""}
        Retry saving, download a backup, or cancel to keep editing.</p>
      <p className="notice">Close warnings and final saves are not guaranteed, especially on mobile or when an app is force-closed. A download must finish before you close this editor.</p>
      {error && <p role="alert">{error}</p>}
      <div className="row wrap">
        <button className="button" ref={cancel} disabled={busy} onClick={() => finish(false)}>Cancel</button>
        <button className="button primary" disabled={busy || localBusy} onClick={async () => {
          setBusy(true); setError("");
          try {
            const snapshot = latest.current;
            // Start permission-sensitive local writes in the button's gesture.
            const fileSave = localStale ? saveLocal() : Promise.resolve(true);
            const [draftSaved, fileSaved] = await Promise.all([flush(), fileSave]);
            if (draftSaved && fileSaved && latest.current === snapshot) finish(true);
            else setError("Not all changes were saved. Keep editing or download a backup before leaving.");
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : "Saving failed. Download a backup before leaving.");
          } finally { setBusy(false); }
        }}>{busy ? "Saving…" : "Retry save and continue"}</button>
        <button className="button" disabled={busy} onClick={() => {
          try {
            const snapshot = latest.current;
            downloadBlob(lessonBlob(snapshot), `${safeName(snapshot.title)}.bbtv`);
            setExported(snapshot); setError("");
          } catch { setError("Could not start the backup download. Keep the editor open and retry."); }
        }}>Download .bbtv backup</button>
        {exported === lesson && <button className="button" disabled={busy || localBusy} onClick={() => finish(true)}>Leave after downloading</button>}
      </div>
    </div>
  </div>;
  return { status, flush, guard, dialog, open: !!request, stopDebounce };
}
