import { useEffect, useState } from "react";
import { extractWordText } from "@/lib/file-tool-operations";

/** Plain React text, never Word HTML, remote media, macros, or embedded scripts. */
export function SharedWordPreview({ data, name }: { data: string; name: string }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setText(""); setError("");
    const timer = setTimeout(() => { if (active) { active = false; setError("This Word preview took too long. Download the original if the owner allows it."); } }, 30000);
    void (async () => {
      const payload = data.split(",")[1];
      if (!payload || payload.length > 23 * 1024 * 1024) throw new Error("This Word document is too large to preview.");
      const bytes = Uint8Array.from(atob(payload), c => c.charCodeAt(0));
      const value = await extractWordText(bytes.buffer);
      if (active) setText(value);
    })().catch(e => { if (active) setError(e instanceof Error ? e.message : "Word preview unavailable."); }).finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); };
  }, [data]);
  return <section className="rounded-xl border bg-white p-5">
    <h2 className="font-semibold">{name}</h2>
    <p className="mb-4 text-xs text-muted-foreground">Word text preview. Original layout, images and tables may differ.</p>
    {error ? <p role="alert">{error}</p> : text ? <article className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words leading-7">{text}</article> : <p role="status">Preparing Word preview…</p>}
  </section>;
}
