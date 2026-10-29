import { useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { libraryRequest, openCloudLesson, type CloudLibrary as CloudLibraryData, type CloudLesson } from "./cloud-library";
import { downloadBlob, safeName } from "./helpers";
import type { Lesson } from "./types";

export function CloudLibrary({ canWrite, refreshKey, onOpen, confirmDelete }: {
  canWrite: boolean; refreshKey: number;
  onOpen: (lesson: Lesson, revision: string) => Promise<void>;
  confirmDelete: (entry: CloudLesson, run: () => Promise<void>) => void;
}) {
  const [data, setData] = useState<CloudLibraryData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [renaming, setRenaming] = useState("");
  const [title, setTitle] = useState("");
  useEffect(() => {
    let active = true;
    const load = () => {
      setData(null); setError(""); setRenaming("");
      void libraryRequest<CloudLibraryData>().then(value => { if (active) setData(value); })
        .catch(failure => { if (active) setError(failure.message); });
    };
    load();
    window.addEventListener("focus", load);
    return () => { active = false; window.removeEventListener("focus", load); };
  }, [refresh, refreshKey]);
  const action = async (run: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await run(); } catch (failure) { setError(failure instanceof Error ? failure.message : "Library request failed. Download a backup and retry."); }
    finally { setBusy(false); }
  };
  const update = (entry: CloudLesson) => setData(current => current ? {
    ...current, usage: { ...current.usage, bytes: current.usage.bytes + entry.bytes - (current.lessons.find(item => item.id === entry.id)?.bytes || 0) },
    lessons: current.lessons.map(item => item.id === entry.id ? entry : item),
  } : current);
  return <section aria-label="Account lesson library">
    <div className="row spread"><h3>Account lessons</h3><button className="button small" disabled={busy} onClick={() => setRefresh(value => value + 1)}>Refresh library</button></div>
    <p className="notice">Private to your BrightBoard account and available on your other devices. Saved lessons do not expire after 24 hours. Keep .bbtv downloads for offline recovery.</p>
    {error && <p className="notice" role="alert">{error}</p>}
    {!data && !error && <p role="status">Loading account lessons…</p>}
    {data && <><p className="notice">{data.usage.lessons} / {data.limits.maxLessons} lessons · {(data.usage.bytes / 1024 / 1024).toFixed(1)} / {data.limits.maxBytes / 1024 / 1024} MB · Up to 64 MB per lesson</p>
      {data.lessons.length ? <div className="library-grid">{data.lessons.map(entry => <div key={entry.id} className="library-card">
        <strong>{entry.title}</strong><span className="notice">{entry.pageCount} pages · Updated {new Date(entry.updatedAt).toLocaleString()}</span>
        <div className="row wrap" style={{ marginTop: 12 }}>
          <button className="button small" disabled={busy} onClick={() => void action(async () => {
            const result = await openCloudLesson(entry.id); await onOpen(result.lesson, result.revision);
          })}>Open</button>
          <button className="button small" disabled={busy} aria-label={`Download account lesson ${entry.title}`} onClick={() => void action(async () => {
            const { lesson } = await openCloudLesson(entry.id);
            downloadBlob(new Blob([JSON.stringify(lesson)], { type: "application/json" }), `${safeName(lesson.title)}.bbtv`);
          })}><Download size={14} /></button>
          <button className="button small" disabled={busy || !canWrite} onClick={() => { setRenaming(entry.id); setTitle(entry.title); }}>Rename</button>
          <button className="button small danger" disabled={busy || !canWrite} aria-label={`Delete account lesson ${entry.title}`} onClick={() => confirmDelete(entry, async () => {
            await libraryRequest(`/${encodeURIComponent(entry.id)}`, { method: "DELETE", headers: { "If-Match": entry.revision } });
            setRefresh(value => value + 1);
          })}><Trash2 size={14} /></button>
        </div>
        {renaming === entry.id && <form className="stack" style={{ marginTop: 12 }} onSubmit={event => { event.preventDefault(); void action(async () => {
          update(await libraryRequest<CloudLesson>(`/${encodeURIComponent(entry.id)}`, { method: "PATCH",
            headers: { "Content-Type": "application/json", "If-Match": entry.revision }, body: JSON.stringify({ title }) }));
          setRenaming("");
        }); }}>
          <label>Lesson title<input aria-label="Account lesson title" value={title} maxLength={200} required onChange={event => setTitle(event.target.value)} /></label>
          <div className="row"><button className="button small" disabled={busy || !canWrite || !title.trim()}>Save title</button><button type="button" className="button small" onClick={() => setRenaming("")}>Cancel</button></div>
        </form>}
      </div>)}</div> : <p className="empty">No account lessons yet. Save your current presentation or upload a device copy below.</p>}
    </>}
  </section>;
}
