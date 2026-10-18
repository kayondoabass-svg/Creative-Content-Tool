import { useEffect, useRef, useState } from "react";

type Action = { title: string; description: string; confirmLabel: string; run: () => void | Promise<void> };

export function useConfirmation() {
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!action) return;
    const previous = document.activeElement as HTMLElement | null;
    cancel.current?.focus();
    return () => previous?.focus();
  }, [action]);
  const close = () => { if (!busy) { setAction(null); setError(""); } };
  const dialog = action && <div className="modal-backdrop" style={{ zIndex: 100 }} onKeyDown={event => {
    if (event.key === "Escape") { event.stopPropagation(); close(); }
    if (event.key === "Tab") {
      const buttons = panel.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!buttons?.length) { event.preventDefault(); return; }
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }}>
    <div className="modal" ref={panel} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
      <h2 id="confirm-title">{action.title}</h2>
      <p id="confirm-description">{action.description}</p>
      {error && <p role="alert" style={{ color: "#a54838" }}>{error}</p>}
      <div className="row wrap" style={{ marginTop: 20, justifyContent: "flex-end" }}>
        <button ref={cancel} className="button" disabled={busy} onClick={close}>Cancel</button>
        <button className="button danger" disabled={busy} onClick={async () => {
          setBusy(true); setError("");
          try { await action.run(); setAction(null); }
          catch (failure) { setError(failure instanceof Error ? failure.message : "Could not complete this action. Your data has not been cleared."); }
          finally { setBusy(false); }
        }}>{busy ? "Please wait…" : action.confirmLabel}</button>
      </div>
    </div>
  </div>;
  return { confirmationOpen: !!action, confirmationDialog: dialog, requestConfirmation: (next: Action) => { setError(""); setAction(next); } };
}
