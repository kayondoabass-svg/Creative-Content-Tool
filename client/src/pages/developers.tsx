import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Footer } from "@/components/footer";
import { newProject, validateProject, MODES, type Project } from "../../../packages/brightboard-media/src/engine";

type Key = { id: string; label: string; prefix: string; createdAt: string; revokedAt: string | null };
type Status = { authenticated: boolean; entitled: boolean; quotaDaily: number; usedToday: number; keys: Key[]; videoAvailable: boolean };
async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(path, { credentials: "include", cache: "no-store", ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
  return data;
}
function sampleProject() {
  const p = newProject(); p.width = 640; p.height = 360; p.duration = 3;
  p.layers = p.layers.map(l => ({ ...l, x: 40, y: 140, width: 560, height: 90, fontSize: 36 }));
  return p;
}
export default function DevelopersPage() {
  const [status, setStatus] = useState<Status | null>(null), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [label, setLabel] = useState("My first app"), [secret, setSecret] = useState(""), [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false), [revoke, setRevoke] = useState<Key | null>(null);
  const [token, setToken] = useState(""), [kind, setKind] = useState("image"), [project, setProject] = useState(sampleProject);
  const load = async () => { try { setStatus(await request("/api/media/developer")); setError(""); } catch(e) { setError((e as Error).message); } };
  useEffect(() => { document.title = "Developers — Free Media API & SDK | BrightBoard"; void load(); }, []);
  const action = async (fn: () => Promise<void>) => {
    setBusy(true); setError(""); setMessage("");
    try { await fn(); } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const create = () => void action(async () => {
    const data = await request("/api/media/keys", { method: "POST", body: JSON.stringify({ label }) });
    setSecret(data.key); setRevealed(false); await load(); setMessage("Key created. Save it now: the server stores only its hash and cannot show it again.");
  });
  const render = () => void action(async () => {
    const res = await fetch("/api/media/v1/generate", { method: "POST", credentials: "omit", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ type: kind, project: validateProject(project) }) });
    if (!res.ok) { const json = await res.json(); throw new Error(json.error || `Render failed (${res.status}).`); }
    const blob = await res.blob(), url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = `brightboard-api.${kind === "image" ? "png" : kind === "audio" ? "wav" : "mp4"}`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000); setMessage("Your generated file download started."); await load();
  });
  const box = "rounded-2xl border border-border bg-card p-5 md:p-7";
  return <><main className="bb-page py-12 max-w-6xl">
    <div className="mb-10"><p className="bb-eyebrow">Build with BrightBoard</p><h1 className="bb-display text-4xl md:text-6xl font-bold my-4">Creativity. On your terms.</h1>
      <p className="text-lg text-muted-foreground max-w-3xl">Free procedural image, video and audio tools for developers. Run the open-source engine on your device, or use account-owned keys for bounded hosted rendering. No external AI generation service.</p>
      <div className="flex flex-wrap gap-3 mt-6"><Link href="/media-studio" className="rounded-xl bg-primary text-primary-foreground px-5 py-3 font-semibold">Open Media Studio</Link><a className="rounded-xl border px-5 py-3" href="/releases/BrightBoard-Media-Studio-source-v1.0.0.zip">Download source · MIT</a><a className="rounded-xl border px-5 py-3" href="/releases/BrightBoard-Media-Studio-prebuilt-v1.0.0.zip">Download offline edition</a><a className="rounded-xl border px-5 py-3" href="/media-offline/">Preview standalone edition</a></div>
    </div>
    <div className="rounded-2xl bg-primary/5 border border-primary/20 p-5 mb-8"><strong>Completely free at launch.</strong> No paid subscription, credit card or per-call charges. Hosted API safety limits protect the shared server; local generation does not use hosted quotas.</div>
    {error && <div className="rounded-xl border border-destructive p-4 mb-5 text-destructive" role="alert">{error} <button className="underline" onClick={() => void load()}>Retry account status</button></div>}
    {message && <div role="status" className="rounded-xl bg-primary/10 p-4 mb-5">{message}</div>}
    <section className={box}><h2 className="text-2xl font-bold mb-3">Your developer keys</h2>
      {!status && <p role="status">Loading account status…</p>}
      {status && !status.authenticated && <p>Free keys are available to every BrightBoard account. <Link href="/login" className="text-primary underline">Sign in</Link> or <Link href="/signup" className="text-primary underline">create an account</Link>, then return here.</p>}
      {status?.authenticated && <><p className="text-sm text-muted-foreground">Today: {status.usedToday} / {status.quotaDaily} renders · resets at 00:00 UTC · up to three active keys. Free access is not tied to your subscription.</p>
        <form className="flex flex-wrap gap-3 mt-5" onSubmit={e => { e.preventDefault(); create(); }}><label className="flex flex-col gap-1 text-sm">Key name<input className="rounded-lg border bg-background px-3 py-2" value={label} maxLength={80} required onChange={e => setLabel(e.target.value)} /></label><button className="rounded-xl bg-primary text-primary-foreground px-4 py-2 self-end disabled:opacity-50" disabled={busy || status.keys.filter(k => !k.revokedAt).length >= 3 || !!secret}>Create free key</button></form>
        {secret && <div className="rounded-xl border border-amber-400 bg-amber-50 text-slate-900 p-4 my-5"><p className="font-semibold mb-2">Shown once. Keep it on your server—not in browser JavaScript.</p><input className="w-full border rounded p-2 bg-white font-mono text-sm" aria-label="New API key" readOnly type={revealed ? "text" : "password"} value={secret} autoComplete="off" /><div className="flex flex-wrap gap-4 mt-3"><button className="underline" onClick={() => setRevealed(v => !v)}>{revealed ? "Hide" : "Reveal"} key</button><button className="underline" onClick={() => void navigator.clipboard.writeText(secret).then(() => setMessage("Key copied. Store it securely.")).catch(() => setError("Clipboard unavailable. Reveal and copy the key manually."))}>Copy key</button><button className="underline" onClick={() => { setSecret(""); setRevealed(false); }}>I saved my key</button></div></div>}
        <ul className="divide-y mt-5">{status.keys.map(k => <li className="py-4 flex items-center justify-between gap-4" key={k.id}><div><strong>{k.label}</strong><p className="text-sm text-muted-foreground font-mono">{k.prefix}…</p><small>{new Date(k.createdAt).toLocaleString()} · {k.revokedAt ? "Revoked" : "Active"}</small></div>{!k.revokedAt && <button disabled={busy} className="border rounded-lg px-3 py-2" onClick={() => setRevoke(k)}>Revoke</button>}</li>)}</ul>
      </>}
    </section>
    <div className="grid lg:grid-cols-2 gap-6 mt-6"><section className={box}><h2 className="text-2xl font-bold mb-3">Server-to-server API</h2><p className="mb-4 text-muted-foreground">POST a saved Media Studio project and receive a real binary file. API keys are hashed at rest, revocable and never included in downloads.</p><code className="block p-3 bg-muted rounded-lg text-sm break-all">POST /api/media/v1/generate</code>
      <pre className="p-4 mt-4 rounded-lg bg-muted text-xs whitespace-pre-wrap break-words">{`// Run on YOUR backend. Never publish a live key.\nconst response = await fetch(base + "/api/media/v1/generate", {\n  method: "POST",\n  headers: {\n    Authorization: "Bearer " + serverStoredKey,\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({type: "image", format: "png", project})\n});\nif (!response.ok) throw new Error(await response.text());\nconst bytes = await response.arrayBuffer();`}</pre>
      <a href="/api/media/openapi.json" download="brightboard-media-openapi.json" className="inline-block mt-4 underline text-primary">Download OpenAPI specification</a>
      <ul className="list-disc pl-5 text-sm space-y-2 mt-5 text-muted-foreground"><li>Images: PNG, JPEG or SVG; up to 1920 pixels per side and 2.1 MP.</li><li>Audio: mono 24 kHz, 16-bit PCM WAV; up to 30 seconds.</li><li>Video: H.264/AAC MP4; up to 640 pixels per side, 230,400 pixels total, even dimensions, 12 FPS and 5 seconds.</li><li>100 requests/day per account; 20 requests/minute per IP; two concurrent renders per host. Failed renders are refunded to the daily allowance.</li><li>Only built-in procedural settings and text/shapes. No arbitrary URLs, code execution or external model calls.</li></ul>
      <p className="mt-4 text-sm">{status?.videoAvailable ? "MP4 rendering is available on this server." : status ? "This host does not currently have FFmpeg video rendering enabled. Local browser recording remains available." : "Checking hosted video availability…"}</p>
    </section><section className={box}><h2 className="text-2xl font-bold mb-3">Try a real render</h2><p className="text-sm text-muted-foreground">Paste your key for this request only. It stays in page memory and is not saved. This playground makes a real API call and uses the hosted safety allowance.</p>
      <label className="block text-sm mt-4">API key<input type="password" autoComplete="off" className="block w-full rounded-lg border bg-background p-3 mt-1" value={token} onChange={e => setToken(e.target.value)} /></label>
      <div className="grid grid-cols-2 gap-4 my-4"><label className="text-sm">Output<select className="block w-full rounded-lg border bg-background p-2 mt-1" value={kind} onChange={e => setKind(e.target.value)}><option value="image">Image PNG</option><option value="audio">Audio WAV</option><option value="video">Video MP4</option></select></label><label className="text-sm">Scene<select className="block w-full rounded-lg border bg-background p-2 mt-1" value={project.mode} onChange={e => setProject(p => ({...p, mode:e.target.value as Project["mode"]}))}>{MODES.map(m=><option key={m}>{m}</option>)}</select></label></div>
      <label className="block text-sm">Or open an exported project<input className="block w-full my-2" type="file" accept=".json" onChange={e=>{ const file=e.target.files?.[0]; e.target.value=""; if(!file)return; if(file.size>250000){setError("Project file exceeds 250 KB.");return;} void file.text().then(t=>setProject(validateProject(JSON.parse(t)))).catch(e=>setError(e.message)); }} /></label><p className="text-xs text-muted-foreground my-3">Current request: {project.width} × {project.height}, {project.duration}s. Large local projects must be resized to API limits before submitting.</p>
      <button className="rounded-xl bg-primary text-primary-foreground px-5 py-3 disabled:opacity-50" disabled={!token || busy || (kind==="video" && !status?.videoAvailable)} onClick={render}>{busy?"Working…":"Generate & download"}</button>
      <h3 className="text-lg font-bold mt-8">Local JavaScript SDK</h3><p className="text-sm text-muted-foreground my-3">Use the same open-source engine locally, with no account or API key. Bundle the SDK with your app for offline use.</p><a href="/media-sdk.js" download className="underline text-primary">Download media-sdk.js</a><pre className="p-4 mt-4 rounded-lg bg-muted text-xs whitespace-pre-wrap">{`// After loading your local media-sdk.js:\nconst p = BrightBoardMedia.newProject();\nconst svg = BrightBoardMedia.renderSVG(p, 0);\nconst wav = BrightBoardMedia.encodeWAV(p.audio, p.duration);\n// svg is text; wav is a Uint8Array.`}</pre>
    </section></div>
    <section className={`${box} mt-6 flex flex-wrap items-center justify-between gap-4`}><div><h2 className="text-2xl font-bold">MCP integration</h2><p className="text-muted-foreground mt-2">A future connection for compatible developer tools. No MCP server or endpoint is available yet.</p></div><span className="rounded-full bg-amber-100 text-amber-900 font-semibold px-4 py-2">Coming soon</span></section>
    <p className="text-sm text-muted-foreground mt-8">The editor and SDK are MIT licensed. BrightBoard’s name and logo remain its brand marks. Procedural generation is not photorealistic AI, voice cloning or general text-to-video.</p>
  </main><Footer />{revoke && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-5"><section className="bg-background rounded-2xl p-6 max-w-md border shadow-xl" role="alertdialog" aria-modal="true" aria-labelledby="revoke-title"><h2 id="revoke-title" className="text-xl font-bold">Revoke {revoke.label}?</h2><p className="my-4">Applications using this key will stop working. This cannot be undone; you can create a replacement key.</p><div className="flex gap-4"><button autoFocus className="border rounded-lg px-4 py-2" onClick={()=>setRevoke(null)}>Keep key</button><button className="bg-destructive text-destructive-foreground rounded-lg px-4 py-2" onClick={()=>void action(async()=>{await request(`/api/media/keys/${revoke.id}`,{method:"DELETE"});setRevoke(null);await load();setMessage("Key revoked.");})}>Revoke key</button></div></section></div>}</>;
}
