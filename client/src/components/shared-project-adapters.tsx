import { useEffect, useRef, useState } from "react";
import Editor from "../../../packages/brightboard-media/src/Editor";
import { renderSVG, validateProject, type Project } from "../../../packages/brightboard-media/src/engine";
import { playAudio } from "../../../packages/brightboard-media/src/browser";
import { blankPage, type Lesson, type Page } from "../../../packages/brightboard-tv/src/types";
import { validLesson } from "../../../packages/brightboard-tv/src/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import "../../../packages/brightboard-media/src/editor.css";

type Props = { content: any; readOnly: boolean; onChange: (value: any) => void; allowExports?: boolean };
export function SharedEditorAdapter({ content, readOnly, onChange, allowExports = true }: Props) {
  const project = validateProject(content);
  const initial = useRef(project);
  const audioStop = useRef<(() => void) | null>(null);
  useEffect(() => () => audioStop.current?.(), []);
  const [time, setTime] = useState(0), [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const started = performance.now();
    const timer = setInterval(() => setTime(((performance.now() - started) / 1000) % project.duration), 50);
    return () => clearInterval(timer);
  }, [playing, project.duration]);
  if (!readOnly) return <Editor hosted initialProject={initial.current} onProjectChange={onChange} allowExports={allowExports} />;
  const svg = renderSVG(project as Project, time);
  return <section className="space-y-3" aria-label="Read-only composition">
    <img className="w-full rounded-xl border" alt={project.title} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} />
    <div className="flex flex-wrap items-center gap-3"><Button onClick={() => setPlaying(v => !v)}>{playing ? "Pause animation" : "Play animation"}</Button>{project.audio.enabled && <Button variant="outline" onClick={async () => { audioStop.current?.(); audioStop.current = await playAudio(project); }}>Preview sound</Button>}<Button variant="ghost" onClick={() => audioStop.current?.()}>Stop sound</Button><span className="text-sm text-muted-foreground">Read only · {project.width} × {project.height} · {project.duration}s</span></div>
    <p className="text-xs text-muted-foreground">This preview is not an editing workspace. Audio starts only after you choose Preview sound.</p>
  </section>;
}

function LessonPage({ page }: { page: Page }) {
  const bg = page.background === "dark" ? "#183a40" : "#ffffff";
  return <svg viewBox="0 0 1600 900" className="w-full rounded-xl border" role="img" aria-label={page.title}>
    <defs><pattern id="share-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#cddbd5" strokeWidth="1" /></pattern><pattern id="share-lined" width="1600" height="40" patternUnits="userSpaceOnUse"><path d="M0 40H1600" stroke="#cddbd5" /></pattern></defs>
    <rect width="1600" height="900" fill={bg} />
    {["grid", "lined"].includes(page.background) && <rect width="1600" height="900" fill={`url(#share-${page.background})`} />}
    {page.ink.map(ink => <path key={ink.id} d={ink.points.map((p, i) => `${i ? "L" : "M"}${p.x * 1600},${p.y * 900}`).join(" ")} stroke={ink.color} strokeWidth={ink.width} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={ink.highlighter ? .35 : 1} />)}
    {page.objects.map(o => {
      const props = { key: o.id, x: o.x * 1600, y: o.y * 900, width: o.width * 1600, height: o.height * 900 };
      if (o.type === "image") return /^data:image\/(?:png|jpeg|webp|gif);/i.test(o.src || "") ? <image {...props} href={o.src} /> : <text key={o.id} x={props.x} y={props.y + 24}>Image unavailable</text>;
      if (o.type === "text") return <text key={o.id} x={props.x} y={props.y + (o.fontSize || 38)} fill={o.color} fontSize={o.fontSize || 38}>{(o.text || "").split("\n").map((line, i) => <tspan key={i} x={props.x} dy={i ? "1.2em" : 0}>{line}</tspan>)}</text>;
      if (o.type === "ellipse") return <ellipse key={o.id} cx={props.x + props.width / 2} cy={props.y + props.height / 2} rx={props.width / 2} ry={props.height / 2} stroke={o.color} strokeWidth="4" fill="none" />;
      if (o.type === "line" || o.type === "arrow") return <g key={o.id}><line x1={props.x} y1={props.y} x2={props.x + props.width} y2={props.y + props.height} stroke={o.color} strokeWidth="4" />{o.type === "arrow" && <circle cx={props.x + props.width} cy={props.y + props.height} r="7" fill={o.color} />}</g>;
      return <rect {...props} fill="none" stroke={o.color} strokeWidth="4" />;
    })}
  </svg>;
}
export function SharedTVAdapter({ content, readOnly, onChange }: Props) {
  const [index, setIndex] = useState(0);
  if (!validLesson(content)) return <p role="alert">This shared lesson is not in a supported format.</p>;
  const lesson: Lesson = content, safeIndex = Math.min(index, lesson.pages.length - 1), page = lesson.pages[safeIndex];
  const edit = (next: Lesson) => onChange({ ...next, updatedAt: new Date().toISOString() });
  const editPage = (patch: Partial<Page>) => edit({ ...lesson, pages: lesson.pages.map((p, i) => i === safeIndex ? { ...p, ...patch } : p) });
  return <section className="space-y-4">
    <div className="flex items-center flex-wrap gap-2"><Button variant="outline" disabled={!safeIndex} onClick={() => setIndex(safeIndex - 1)}>Previous</Button><span>Page {safeIndex + 1} / {lesson.pages.length}</span><Button variant="outline" disabled={safeIndex === lesson.pages.length - 1} onClick={() => setIndex(safeIndex + 1)}>Next</Button></div>
    <h3 className="font-bold">{page.title}</h3><LessonPage page={page} />
    {page.model && <div className="rounded-xl border p-4"><p className="font-semibold">3D model: {page.model.name}</p><SharedModel model={page.model} /><p className="text-sm">{page.model.attribution} · {page.model.license}</p></div>}
    {!readOnly && <div className="space-y-4 rounded-xl border p-4">
      <label className="block text-sm font-semibold">Page title<Input value={page.title} maxLength={160} onChange={e => editPage({ title: e.target.value })} /></label>
      <label className="block text-sm font-semibold">Surface<select className="ml-3 rounded border p-2" value={page.background} onChange={e => editPage({ background: e.target.value as Page["background"] })}>{["light","dark","lined","grid"].map(bg => <option key={bg}>{bg}</option>)}</select></label>
      {page.objects.map((o, i) => <div key={o.id} className="space-y-2 rounded border p-3">
        <span className="font-medium">{o.type} {i + 1}</span>
        {o.type === "text" && <Textarea aria-label={`Text object ${i + 1}`} value={o.text || ""} onChange={e => editPage({ objects: page.objects.map(v => v.id === o.id ? { ...v, text: e.target.value } : v) })} />}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{(["x","y","width","height"] as const).map(key => <label key={key} className="text-xs">{key}<Input type="number" min="0" max="1" step=".01" value={o[key]} onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 0 && n <= 1) editPage({ objects: page.objects.map(v => v.id === o.id ? { ...v, [key]: n } : v) }); }} /></label>)}</div>
        <Button variant="outline" onClick={() => editPage({ objects: page.objects.filter(v => v.id !== o.id) })}>Remove object</Button>
      </div>)}
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => editPage({ objects: [...page.objects, { id: crypto.randomUUID(), type: "text", text: "New text", x: .1, y: .1, width: .7, height: .15, color: "#183a40", fontSize: 38 }] })}>Add text</Button><Button variant="outline" disabled={lesson.pages.length >= 100} onClick={() => { edit({ ...lesson, pages: [...lesson.pages, blankPage("New page")] }); setIndex(lesson.pages.length); }}>Add page</Button><Button variant="outline" disabled={lesson.pages.length < 2} onClick={() => { if (window.confirm("Remove this page from the unpublished draft?")) edit({ ...lesson, pages: lesson.pages.filter((_, i) => i !== safeIndex) }); }}>Remove page</Button></div>
      <details><summary className="cursor-pointer text-sm">Advanced page data (ink, models and object settings)</summary><ValidatedPage page={page} onChange={editPage} /></details>
    </div>}
    {readOnly && <p className="text-sm text-muted-foreground">Read-only lesson preview. Presenter notes are not shown here.</p>}
  </section>;
}
function SharedModel({ model }: { model: NonNullable<Page["model"]> }) {
  const ref = useRef<HTMLDivElement>(null), [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    void import("@google/model-viewer").then(() => {
      if (!alive || !ref.current) return;
      const viewer = document.createElement("model-viewer");
      viewer.setAttribute("src", model.src); viewer.setAttribute("camera-controls", "");
      viewer.setAttribute("alt", model.name); viewer.setAttribute("loading", "eager");
      if (model.cameraOrbit) viewer.setAttribute("camera-orbit", model.cameraOrbit);
      viewer.style.width = "100%"; viewer.style.height = "360px";
      viewer.addEventListener("error", () => setError("The 3D preview could not load on this device. The saved model remains in the document."));
      ref.current.replaceChildren(viewer);
    }).catch(() => setError("3D preview is unavailable in this browser."));
    return () => { alive = false; ref.current?.replaceChildren(); };
  }, [model.src, model.name, model.cameraOrbit]);
  return <div><div ref={ref} />{error && <p role="alert">{error}</p>}</div>;
}
function ValidatedPage({ page, onChange }: { page: Page; onChange: (page: Page) => void }) {
  const [text, setText] = useState(JSON.stringify(page, null, 2)), [error, setError] = useState("");
  return <div className="mt-3 space-y-2"><Textarea className="h-64 font-mono text-xs" value={text} onChange={e => setText(e.target.value)} /><Button onClick={() => {
    try { const next = JSON.parse(text); if (!validLesson({ format: "brightboard-tv", version: 1, id: "preview", title: "Preview", updatedAt: new Date().toISOString(), pages: [next] })) throw new Error("Invalid page data."); onChange(next); setError(""); } catch { setError("Page data is invalid. No changes applied."); }
  }}>Apply page data</Button>{error && <p role="alert">{error}</p>}</div>;
}
