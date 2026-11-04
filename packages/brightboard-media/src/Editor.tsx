import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { newProject, validateProject, renderSVG, MODES, type Project, type Layer } from "./engine";
import { download, exportImage, audioFile, playAudio, recordVideo, supportedVideo } from "./browser";
import "./editor.css";

const KEY = "brightboard-media-project-v1";
const names = { flow: "Flow field", tree: "Swaying tree", waves: "Wave terrain", pattern: "Geometric pattern", mark: "Geometric mark", sculpture: "3D sculpture" };
const clone = (p: Project) => JSON.parse(JSON.stringify(p)) as Project;
const filename = (p: Project) => p.title.replace(/[^a-z0-9-_]/gi, "-").slice(0, 60) || "brightboard-media";
function NumericField({ label, value, commit, min, max, step, disabled }: { label: string; value: number; commit: (n:number)=>void; min:number; max:number; step:number; disabled:boolean }) {
  const [draft,setDraft]=useState(String(value)),[invalid,setInvalid]=useState(false);
  const cancelled=useRef(false);
  useEffect(()=>{setDraft(String(value));setInvalid(false);},[value]);
  const apply=()=>{
    if(cancelled.current){cancelled.current=false;return;}
    const n=Number(draft);
    if(!draft.trim()||!Number.isFinite(n)||n<min||n>max){setInvalid(true);return;}
    setInvalid(false); if(n!==value) commit(n);
  };
  return <label className="bm-field">{label}<input type="number" value={draft} min={min} max={max} step={step} disabled={disabled} aria-invalid={invalid}
    onChange={e=>{setDraft(e.target.value);setInvalid(false);}} onBlur={apply} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();if(e.key==="Escape"){cancelled.current=true;setDraft(String(value));setInvalid(false);e.currentTarget.blur();}}} />
    {invalid&&<span role="alert" style={{color:"#a83e36"}}>Choose {min}–{max}. Press Enter to apply.</span>}</label>;
}
export default function Editor({ hosted = false }: { hosted?: boolean }) {
  const [p, setP] = useState(newProject), [selected, setSelected] = useState("headline");
  const [past, setPast] = useState<Project[]>([]), [future, setFuture] = useState<Project[]>([]);
  const [time, setTime] = useState(0), [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState("Create locally. Your project never goes to a generation service.");
  const [error, setError] = useState(false), [status, setStatus] = useState("Loading local draft…");
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(""), [progress, setProgress] = useState(0);
  const [size, setSize] = useState("native"), [quality, setQuality] = useState(0.92), [fps, setFPS] = useState(30), [bitrate, setBitrate] = useState(12);
  const [replacement, setReplacement] = useState<Project | null>(null);
  const input = useRef<HTMLInputElement>(null), stopAudio = useRef<(() => void) | null>(null), abort = useRef<AbortController | null>(null);
  const latest = useRef(p), saved = useRef(""), generation = useRef(0);
  const drag = useRef<{ p: Project; x: number; y: number; id: string } | null>(null);
  latest.current = p;
  const announce = useCallback((s: string, bad = false) => { setMessage(s); setError(bad); }, []);
  useEffect(() => {
    try {
      const value = localStorage.getItem(KEY);
      if (value) { const project = validateProject(JSON.parse(value)); setP(project); setSelected(project.layers[0]?.id || ""); saved.current = JSON.stringify(project); }
      setReady(true);
    } catch { setStatus("Draft recovery failed"); announce("The previous draft could not be read. It has not been overwritten. Open a project file or choose New project to continue saving.", true); }
    return () => { abort.current?.abort(); stopAudio.current?.(); };
  }, [announce]);
  useEffect(() => {
    if (!ready) return;
    setStatus("Saving on this device…");
    const id = setTimeout(() => {
      try { const data = JSON.stringify(validateProject(p)); localStorage.setItem(KEY, data); saved.current = data; setStatus("Saved on this device"); }
      catch { setStatus("Could not save draft"); announce("Browser storage is unavailable or full. Your edits remain in this tab; download a project backup before leaving.", true); }
    }, 300);
    return () => clearTimeout(id);
  }, [p, ready, announce]);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => { if (abort.current || JSON.stringify(latest.current) !== saved.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", leave); return () => window.removeEventListener("beforeunload", leave);
  }, []);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === KEY && event.newValue !== saved.current) {
        setReady(false); setStatus("Draft changed in another tab");
        announce("Another tab changed this device’s draft. Autosave is paused to protect both projects. Download your current project, then open that backup or choose New to resume.", true);
      }
    };
    window.addEventListener("storage", changed); return () => window.removeEventListener("storage", changed);
  }, [announce]);
  useEffect(() => {
    if (!playing) return;
    let id: number; const start = performance.now() - time * 1000;
    const tick = () => { setTime(((performance.now() - start) / 1000) % latest.current.duration); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick); return () => cancelAnimationFrame(id);
  }, [playing]);
  const update = (fn: (p: Project) => Project, history = true) => {
    if (busy) return;
    const before = latest.current;
    const next = fn(clone(before));
    try { validateProject(next); }
    catch (e) { announce((e as Error).message, true); return; }
    if (history) { setPast(old => [...old.slice(-39), before]); setFuture([]); }
    if (error) { setError(false); setMessage("Composition updated."); }
    latest.current = next; setP(next);
  };
  const patch = (value: Partial<Project>) => update(p => ({ ...p, ...value }));
  const layer = p.layers.find(l => l.id === selected);
  const edit = (value: Partial<Layer>) => update(p => ({ ...p, layers: p.layers.map(l => l.id === selected ? { ...l, ...value } : l) }));
  const audio = (value: Partial<Project["audio"]>) => patch({ audio: { ...p.audio, ...value } });
  const add = (type: Layer["type"]) => {
    const id = `layer-${Date.now()}-${++generation.current}`;
    update(p => ({ ...p, layers: [...p.layers, { id, type, text: type === "text" ? "Your headline" : "", x: p.width * 0.2, y: p.height * 0.35,
      width: type === "text" ? p.width * 0.65 : p.width * 0.3, height: p.height * 0.2,
      rotation: 0, fill: type === "text" ? p.primary : p.accent, opacity: 1, fontSize: Math.round(p.height * 0.07), visible: true, motion: "none", amount: 30 }] }));
    setSelected(id);
  };
  const saveProject = () => {
    try { const project = validateProject(p); download(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }), `${filename(p)}.bbmedia.json`); announce("Project download started. Keep this file as your portable backup."); }
    catch (e) { announce((e as Error).message, true); }
  };
  const replace = (project: Project) => {
    setPast([]); setFuture([]); setP(project); latest.current = project; setSelected(project.layers[0]?.id || ""); setTime(0); setReady(true); setReplacement(null); setPlaying(false);
  };
  const requestReplace = (project: Project) => {
    setReplacement(project);
  };
  const open = async (file?: File) => {
    if (!file) return;
    try { if (file.size > 250_000) throw new Error("Project files must be 250 KB or smaller. Media projects store settings, not uploaded files."); const project = validateProject(JSON.parse(await file.text())); requestReplace(project); }
    catch (e) { announce((e as Error).message, true); }
  };
  const dimensions = () => {
    const edge = size === "native" ? Math.max(p.width, p.height) : Number(size);
    return { width: Math.round(p.width / Math.max(p.width, p.height) * edge), height: Math.round(p.height / Math.max(p.width, p.height) * edge) };
  };
  const run = async (action: string, fn: () => Promise<void>) => {
    if (busy) return; setBusy(action); setPlaying(false); setProgress(0);
    try { await fn(); } catch (e) { announce((e as Error).message || "Export failed.", true); }
    finally { abort.current = null; setBusy(""); }
  };
  const still = (format: "png" | "jpeg") => void run("Rendering image…", async () => {
    const { width, height } = dimensions(), blob = await exportImage(validateProject(p), format, width, height, time, quality);
    download(blob, `${filename(p)}-${width}x${height}.${format === "jpeg" ? "jpg" : "png"}`); announce(`Exported ${width} × ${height} ${format.toUpperCase()}.`);
  });
  const video = () => void run("Recording video…", async () => {
    const controller = new AbortController(); abort.current = controller;
    const { width, height } = dimensions();
    if (width > 3840 || height > 3840) throw new Error("Video is limited to a 3840-pixel edge. Choose Full HD or 4K; 8K is for stills only.");
    const result = await recordVideo(validateProject(p), { width, height, fps, bitrate: bitrate * 1_000_000, signal: controller.signal, progress: setProgress });
    download(result.blob, `${filename(p)}.${result.extension}`); announce(`Recorded ${p.duration}s ${result.extension.toUpperCase()}${p.audio.enabled ? " with synthesized audio" : " without audio"}.`);
  });
  const numberField = (label: string, value: number, change: (n: number) => void, min: number, max: number, step = 1) => <NumericField label={label} value={value} commit={change} min={min} max={max} step={step} disabled={!!busy} />;
  const svg = useMemo(() => renderSVG(p, time), [p, time]);
  const reorder = (direction: number) => update(p => { const at = p.layers.findIndex(l => l.id === selected), to = at + direction; if (to >= 0 && to < p.layers.length) [p.layers[at], p.layers[to]] = [p.layers[to], p.layers[at]]; return p; });
  return <div className="bm-studio">
    <header className="bm-header"><a href={hosted ? "/" : "https://www.brightboardapp.com"} className="bm-brand"><img src={hosted ? "/brand-logo.png" : "./brand-logo.png"} alt="BrightBoard" /><span>BrightBoard <b>Media Studio</b></span></a>
      <span className="bm-local">Local-first · Open source</span><nav><a href={hosted ? "/developers" : "https://www.brightboardapp.com/developers"}>Developers</a><a href={hosted ? "/releases/BrightBoard-Media-Studio-prebuilt-v1.0.0.zip" : "./README.md"}>{hosted ? "Download offline" : "Read me"}</a></nav></header>
    <div className="bm-project-bar"><div><input aria-label="Project title" className="bm-project-title" value={p.title} maxLength={160} onChange={e => patch({ title: e.target.value })} disabled={!!busy} /><small role="status">{status}</small></div>
      <div className="bm-actions"><button disabled={!past.length || !!busy} onClick={() => { const before = past[past.length - 1]; setFuture(v => [p, ...v]); setPast(v => v.slice(0, -1)); setP(before); }}>Undo</button><button disabled={!future.length || !!busy} onClick={() => { setPast(v => [...v, p]); setP(future[0]); setFuture(v => v.slice(1)); }}>Redo</button>
        <button disabled={!!busy} onClick={() => input.current?.click()}>Open project</button><button className="bm-primary" onClick={saveProject}>Save project</button><button disabled={!!busy} onClick={() => requestReplace(newProject())}>New</button>
        <input ref={input} type="file" accept=".json,.bbmedia" hidden onChange={e => { void open(e.target.files?.[0]); e.target.value = ""; }} /></div></div>
    <div className={`bm-message ${error ? "bm-error" : ""}`} role={error ? "alert" : "status"}>{message}</div>
    <div className="bm-workspace">
      <aside className="bm-panel"><fieldset disabled={!!busy}><legend>Scene & composition</legend>
        <label className="bm-field">Procedural scene<select value={p.mode} onChange={e => patch({ mode: e.target.value as Project["mode"] })}>{MODES.map(m => <option key={m} value={m}>{names[m]}</option>)}</select></label>
        <div className="bm-grid">{numberField("Width (px)", p.width, width => patch({ width }), 64, 7680)}{numberField("Height (px)", p.height, height => patch({ height }), 64, 7680)}</div>
        <div className="bm-actions bm-wrap">{[[1920,1080,"Landscape"],[1080,1920,"Portrait"],[1080,1080,"Square"]].map(([w,h,label]) => <button key={String(label)} onClick={() => update(v => { const sx = Number(w) / v.width, sy = Number(h) / v.height; return { ...v, width: Number(w), height: Number(h), layers: v.layers.map(l => ({ ...l, x: l.x * sx, y: l.y * sy, width: l.width * Math.min(sx,sy), height: l.height * Math.min(sx,sy), fontSize: Math.max(8,Math.min(500,l.fontSize*Math.min(sx,sy))) })) }; })}>{label}</button>)}</div>
        <div className="bm-grid">{numberField("Seed", p.seed, seed => patch({ seed }), 0, 2147483647)}<button onClick={() => patch({ seed: Math.floor(Math.random() * 2147483647) })}>Randomize</button></div>
        <label className="bm-field">Density · {p.density}<input type="range" min="5" max="100" value={p.density} onChange={e => patch({ density: +e.target.value })} /></label>
        <div className="bm-colors">{(["background","primary","accent"] as const).map(k => <label key={k}>{k}<input type="color" value={p[k]} onChange={e => patch({ [k]: e.target.value })} /></label>)}</div>
        <div className="bm-grid">{numberField("Speed", p.speed, speed => patch({ speed }), 0.1, 4, 0.1)}{numberField("Duration (s)", p.duration, duration => patch({ duration }), 1, 120)}</div>
        {p.mode === "sculpture" && <label className="bm-field">3D camera orbit<input type="range" min="-3.14" max="3.14" step=".01" value={p.camera} onChange={e => patch({ camera: +e.target.value })} /></label>}
      </fieldset><fieldset disabled={!!busy}><legend>Synthesized audio</legend>
        <label className="bm-check"><input type="checkbox" checked={p.audio.enabled} onChange={e => audio({ enabled: e.target.checked })} /> Include audio in video</label>
        <label className="bm-field">Waveform<select value={p.audio.waveform} onChange={e => audio({ waveform: e.target.value as Project["audio"]["waveform"] })}>{["sine","triangle","square","sawtooth","noise"].map(v => <option key={v}>{v}</option>)}</select></label>
        <div className="bm-grid">{numberField("Pitch (Hz)", p.audio.frequency, frequency => audio({ frequency }), 30, 2000)}{numberField("Tempo (BPM)", p.audio.bpm, bpm => audio({ bpm }), 30, 240)}</div>
        <label className="bm-field">Volume · {Math.round(p.audio.volume * 100)}%<input type="range" min="0" max=".5" step=".01" value={p.audio.volume} onChange={e => audio({ volume: +e.target.value })} /></label>
        <label className="bm-check"><input type="checkbox" checked={p.audio.rhythm} onChange={e => audio({ rhythm: e.target.checked })} /> Rhythm envelope</label>
        <label className="bm-field">Beat sequence (1 = sound, 0 = rest)<input value={p.audio.sequence} maxLength={16} onChange={e => { if (/^[01]{1,16}$/.test(e.target.value)) audio({ sequence: e.target.value }); }} /></label>
        <div className="bm-actions"><button onClick={() => { stopAudio.current?.(); void playAudio(p).then(stop => { stopAudio.current = stop; announce("Playing locally synthesized audio. Use Stop sound to mute."); }).catch(e => announce(e.message, true)); }}>Play sound</button><button onClick={() => { stopAudio.current?.(); stopAudio.current = null; }}>Stop sound</button></div>
      </fieldset></aside>
      <main className="bm-center"><div className="bm-canvas-info"><span>{names[p.mode]}</span><span>{p.width} × {p.height} · v1.0.0</span></div>
        <div className="bm-stage" style={{ aspectRatio: `${p.width}/${p.height}`, width: `min(100%, ${65 * p.width / p.height}vh)`, marginInline: "auto", maxHeight: "none" }}><div className="bm-svg" dangerouslySetInnerHTML={{ __html: svg }} />
          <svg className="bm-selection" viewBox={`0 0 ${p.width} ${p.height}`} aria-label="Editable layers"
            onPointerMove={e => { const d = drag.current; if (!d) return; const rect = e.currentTarget.getBoundingClientRect(), x = (e.clientX - rect.left) * p.width / rect.width, y = (e.clientY - rect.top) * p.height / rect.height; const next = clone(d.p), l = next.layers.find(l => l.id === d.id)!; l.x = Math.round(d.p.layers.find(l => l.id === d.id)!.x + x - d.x); l.y = Math.round(d.p.layers.find(l => l.id === d.id)!.y + y - d.y); setP(next); latest.current = next; }}
            onPointerUp={() => { const completed = drag.current; drag.current = null; if (completed && JSON.stringify(completed.p) !== JSON.stringify(latest.current)) { setPast(v => [...v.slice(-39), completed.p]); setFuture([]); } }}>
            {p.layers.filter(l => l.visible).map(l => <rect key={l.id} x={l.x} y={l.y} width={l.width} height={l.height} transform={`rotate(${l.rotation} ${l.x+l.width/2} ${l.y+l.height/2})`}
              fill="transparent" stroke={selected === l.id ? "#125c60" : "transparent"} strokeDasharray="8 6" strokeWidth={Math.max(2,p.width/700)}
              role="button" tabIndex={0} aria-label={`Select ${l.type} layer ${l.text || l.id}`} aria-pressed={selected === l.id}
              onPointerDown={e => { if (busy) return; setSelected(l.id); const root = e.currentTarget.ownerSVGElement!, r = root.getBoundingClientRect(); drag.current = { p: clone(p), x: (e.clientX-r.left)*p.width/r.width, y:(e.clientY-r.top)*p.height/r.height, id:l.id }; root.setPointerCapture(e.pointerId); }}
              onKeyDown={e => { if (e.key === "Escape" && drag.current) { setP(drag.current.p); drag.current = null; return; } if (e.key === "Enter") setSelected(l.id); const distance = e.shiftKey ? 10 : 1; if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) { e.preventDefault(); setSelected(l.id); update(v => ({...v,layers:v.layers.map(o=>o.id===l.id?{...o,x:o.x+(e.key==="ArrowLeft"?-distance:e.key==="ArrowRight"?distance:0),y:o.y+(e.key==="ArrowUp"?-distance:e.key==="ArrowDown"?distance:0)}:o)})); } }} />)}
          </svg></div>
        <div className="bm-transport"><button disabled={!!busy} onClick={() => setPlaying(v => !v)}>{playing ? "Pause" : "Play preview"}</button><input aria-label="Preview time" type="range" min="0" max={p.duration} step=".01" value={time} onChange={e => { setPlaying(false); setTime(+e.target.value); }} /><span>{time.toFixed(1)} / {p.duration}s</span></div>
        <p className="bm-caption">Procedural geometry, editable layers and real 3D projection. No prompts sent to an AI service. Audio plays only when you choose it.</p>
        <section className="bm-export"><h2>Export your composition</h2><div className="bm-export-fields">
          <label className="bm-field">Output size<select value={size} disabled={!!busy} onChange={e => setSize(e.target.value)}><option value="native">Project dimensions</option><option value="1920">Full HD · 1920px edge</option><option value="3840">4K · 3840px edge</option><option value="7680">8K still · 7680px edge</option></select></label>
          {numberField("JPEG quality", quality, setQuality, 0.1, 1, .05)}{numberField("Video FPS target", fps, setFPS, 12, 60)}{numberField("Video bitrate (Mbps)", bitrate, setBitrate, 2, 40)}</div>
          <p className="bm-caption">{dimensions().width} × {dimensions().height} pixels. High-resolution geometry is rerendered, not a stretched preview. Large canvases depend on device memory. Video records in real time; FPS is a target, not a guarantee.</p>
          <div className="bm-actions bm-wrap"><button disabled={!!busy} onClick={() => still("png")}>Export PNG</button><button disabled={!!busy} onClick={() => still("jpeg")}>Export JPEG</button><button disabled={!!busy} onClick={() => { download(new Blob([renderSVG(validateProject(p),time)],{type:"image/svg+xml"}),`${filename(p)}.svg`); announce("Downloaded a fully vector procedural composition."); }}>Export SVG</button><button disabled={!!busy} onClick={() => download(audioFile(validateProject(p)),`${filename(p)}.wav`)}>Export WAV</button><button className="bm-primary" disabled={!!busy || !supportedVideo()} onClick={video}>Record video{supportedVideo()?.includes("mp4") ? " · MP4" : " · WebM"}</button></div>
          {!supportedVideo() && <p role="status">This browser does not support local video recording. Image, SVG, WAV and project exports remain available.</p>}
          {busy && <div className="bm-progress" role="status"><span>{busy} {Math.round(progress*100)}%</span><progress max="1" value={progress} />{abort.current && <button onClick={() => abort.current?.abort()}>Cancel recording</button>}</div>}
        </section></main>
      <aside className="bm-panel"><fieldset disabled={!!busy}><legend>Layers</legend><div className="bm-actions bm-wrap"><button onClick={() => add("text")}>+ Text</button><button onClick={() => add("rect")}>+ Card</button><button onClick={() => add("ellipse")}>+ Ellipse</button></div>
        <div className="bm-layer-list">{[...p.layers].reverse().map(l => <div key={l.id} className={selected===l.id?"bm-layer active":"bm-layer"}><button aria-pressed={selected===l.id} onClick={() => setSelected(l.id)}>{l.type === "text" ? l.text.slice(0,24) || "Empty text" : l.type}</button><button aria-label={`${l.visible?"Hide":"Show"} ${l.type} layer`} onClick={() => update(v=>({...v,layers:v.layers.map(o=>o.id===l.id?{...o,visible:!o.visible}:o)}))}>{l.visible?"Visible":"Hidden"}</button></div>)}</div>
        {layer && <><div className="bm-actions bm-wrap"><button onClick={() => reorder(1)}>Forward</button><button onClick={() => reorder(-1)}>Backward</button><button onClick={() => { update(v=>({...v,layers:v.layers.filter(l=>l.id!==selected)})); setSelected(""); }}>Delete</button></div>
          {layer.type==="text" && <label className="bm-field">Text<textarea value={layer.text} maxLength={500} onChange={e=>edit({text:e.target.value})} /></label>}
          <div className="bm-grid">{numberField("X",layer.x,x=>edit({x}),-15360,15360)}{numberField("Y",layer.y,y=>edit({y}),-15360,15360)}{numberField("Width",layer.width,width=>edit({width}),1,15360)}{numberField("Height",layer.height,height=>edit({height}),1,15360)}{numberField("Rotation",layer.rotation,rotation=>edit({rotation}),-360,360)}{layer.type==="text"&&numberField("Font size",layer.fontSize,fontSize=>edit({fontSize}),8,500)}</div>
          <label className="bm-field">Layer colour<input type="color" value={layer.fill} onChange={e=>edit({fill:e.target.value})}/></label><label className="bm-field">Opacity<input type="range" min="0" max="1" step=".05" value={layer.opacity} onChange={e=>edit({opacity:+e.target.value})}/></label>
          <label className="bm-field">Layer motion<select value={layer.motion} onChange={e=>edit({motion:e.target.value as Layer["motion"]})}>{["none","float","pulse","slide"].map(v=><option key={v}>{v}</option>)}</select></label>{numberField("Motion amount",layer.amount,amount=>edit({amount}),0,1000)}
        </>}
      </fieldset><section className="bm-note"><h2>Yours to keep</h2><p>Free, open-source procedural creation. Downloads stay on your device. Browser drafts are not cloud backups.</p><p>MIT licensed · v1.0.0</p>{hosted && <a href="/releases/BrightBoard-Media-Studio-source-v1.0.0.zip">Download source code</a>}</section></aside>
    </div>
    {replacement && <div className="bm-modal-backdrop"><section className="bm-modal" role="alertdialog" aria-modal="true" aria-labelledby="bm-replace-title"><h2 id="bm-replace-title">Replace the current project?</h2><p>Unsaved changes will be replaced. Download a project backup first if you want to keep this composition.</p><div className="bm-actions bm-wrap"><button autoFocus onClick={()=>setReplacement(null)}>Keep editing</button><button onClick={saveProject}>Download backup</button><button className="bm-danger" onClick={()=>replace(replacement)}>Discard and continue</button></div></section></div>}
  </div>;
}
