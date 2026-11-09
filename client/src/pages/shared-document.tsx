import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Link, useLocation, useRoute, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Clock3, Download, FileText, GitFork, History, Image as ImageIcon, Link as LinkIcon, LockKeyhole, MessageSquare, RefreshCw, Save, Send, Settings2, Upload, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/use-auth";
import { WordSearchPreview } from "@/components/word-search-preview";
import { isPrivateShareKey, prepareShareSnapshot, sharingRequest, SharingError, stableShareUrl, type SharedDetail, type ShareOptions } from "@/lib/sharing";
import { SharedEditorAdapter, SharedTVAdapter } from "@/components/shared-project-adapters";

function isImageKey(key: string) {
  const normalized = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  return /^(?:image|images|image_url|image_urls|imageurl|image_data|image_base64|photo|photos|picture|pictures|thumbnail|thumbnails|src|background|b64_json)$/.test(normalized) ||
    /^(?:cover|profile|slide|card|background|thumbnail)_image(?:_url)?$/.test(normalized);
}
function isImagePayloadKey(key: string, parentIsImage: boolean) {
  return isImageKey(key) || (parentIsImage && /^(?:url|href|data|base64)$/i.test(key));
}
function looksLikeImageReference(value: string) {
  return /^data:image\//i.test(value) || /^https?:\/\//i.test(value) || /^(?:\/|\.\/)/.test(value) ||
    /\.(?:png|jpe?g|webp|gif|bmp|avif|tiff?)(?:[?#].*)?$/i.test(value) ||
    (value.length > 128 && /^[A-Za-z0-9+/]+=*$/.test(value));
}
function parseStructuredContent(content: any) {
  const body = content && typeof content === "object" && typeof content.body === "string" ? content.body : content;
  if (typeof body === "string" && /^[\s]*(\{|\[)/.test(body)) {
    try { return JSON.parse(body); } catch { return body; }
  }
  return body;
}
function wrapStructuredContent(content: any, value: any) {
  if (content && typeof content === "object" && typeof content.body === "string") {
    const originalIsStructured = /^[\s]*(\{|\[)/.test(content.body);
    return { ...content, body: typeof value === "string" && !originalIsStructured ? value : JSON.stringify(value) };
  }
  return value;
}
function collectImages(value: any, key = "", imageContext = false, found: string[] = []): string[] {
  if (typeof value === "string") {
    if (/^data:image\//i.test(value)) found.push(value);
    else if ((imageContext || isImageKey(key)) && value.length > 128 && /^[A-Za-z0-9+/]+=*$/.test(value)) found.push(`data:image/png;base64,${value}`);
    return found;
  }
  if (Array.isArray(value)) { value.forEach(item => collectImages(item, key, imageContext || isImageKey(key), found)); return found; }
  if (value && typeof value === "object") {
    for (const [childKey, child] of Object.entries(value)) collectImages(child, childKey, isImagePayloadKey(childKey, imageContext), found);
  }
  return Array.from(new Set(found));
}
function replaceFirstImage(value: any, replacement: string, imageContext = false): { value: any; replaced: boolean } {
  if (typeof value === "string") return imageContext && looksLikeImageReference(value) ? { value: replacement, replaced: true } : { value, replaced: false };
  if (Array.isArray(value)) {
    const next = [...value];
    for (let i = 0; i < next.length; i++) {
      const result = replaceFirstImage(next[i], replacement, imageContext);
      if (result.replaced) { next[i] = result.value; return { value: next, replaced: true }; }
    }
    return { value, replaced: false };
  }
  if (value && typeof value === "object") {
    const next = { ...value };
    const keys = Object.keys(next).sort((a, b) => Number(isImagePayloadKey(b, imageContext)) - Number(isImagePayloadKey(a, imageContext)));
    for (const key of keys) {
      const result = replaceFirstImage(next[key], replacement, isImagePayloadKey(key, imageContext));
      if (result.replaced) { next[key] = result.value; return { value: next, replaced: true }; }
    }
  }
  return { value, replaced: false };
}

function SafeFilePreview({ content, title }: { content: any; title: string }) {
  const [pdfUrl, setPdfUrl] = useState("");
  const data = typeof content?.data === "string" ? content.data : "";
  const mime = String(content?.mime || data.match(/^data:([^;,]+)/i)?.[1] || "");
  const [pdfError, setPdfError] = useState(false);
  useEffect(() => {
    let active = true, objectUrl = "";
    if (mime === "application/pdf" && data.startsWith("data:application/pdf")) {
      setPdfError(false);
      void fetch(data).then(response => response.blob()).then(blob => {
        objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        if (active) setPdfUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      }).catch(() => { if (active) { setPdfUrl(""); setPdfError(true); } });
    } else setPdfUrl("");
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [data, mime]);
  if (mime === "application/pdf" && data.startsWith("data:application/pdf")) {
    return pdfUrl
      ? <iframe title={`Safe preview of ${title}`} src={pdfUrl} sandbox="allow-same-origin" className="h-[70vh] min-h-[480px] w-full rounded-xl border border-[#d8dfd4] bg-white" />
      : pdfError
        ? <div role="status" className="grid h-64 place-items-center rounded-xl border border-dashed border-[#cbd8cf] text-center text-sm text-[#617574]">This browser could not prepare a preview. Use Download original if the owner allows it.</div>
        : <div className="grid h-64 place-items-center rounded-xl border border-dashed border-[#cbd8cf] text-sm text-[#617574]">Preparing secure PDF preview…</div>;
  }
  if (mime.startsWith("audio/") && data.startsWith("data:audio/")) return <audio controls preload="metadata" src={data} className="w-full" />;
  if (mime.startsWith("video/") && data.startsWith("data:video/")) return <video controls preload="metadata" src={data} className="max-h-[70vh] max-w-full rounded-xl bg-[#183c40]" />;
  if (data.startsWith("data:image/")) return <img src={data} alt={content?.name || title} className="mx-auto max-h-[70vh] max-w-full rounded-xl object-contain" />;
  return <div className="rounded-2xl border border-[#d8dfd4] bg-[#f3f2ea] p-8 text-center"><FileText className="mx-auto h-10 w-10 text-[#2f7472]" /><p className="mt-3 font-semibold">{content?.name || title}</p><p className="mt-1 text-sm text-[#617574]">A safe in-browser preview is not available for this format.</p></div>;
}

function SharedContent({ doc, content, editable, onChange, onError, setDraftValid }: { doc: SharedDetail; content: any; editable: boolean; onChange: (v: any) => void; onError: (message: string) => void; setDraftValid: (valid: boolean) => void }) {
  if (doc.kind === "editor") return editable ? <SharedEditorAdapter key={`${doc.id}:${doc.revision}`} content={content} readOnly={false} onChange={onChange} allowExports={doc.role === "owner" || doc.allowDownload} /> : <SharedEditorAdapter key={`${doc.id}:${doc.revision}`} content={content} readOnly onChange={() => {}} />;
  if (doc.kind === "tv") return editable ? <SharedTVAdapter content={content} readOnly={false} onChange={onChange} /> : <SharedTVAdapter content={content} readOnly onChange={() => {}} />;
  if (doc.kind === "file") {
    const replaceFile = (file?: File) => {
      if (!file) return;
      if (file.size > 11 * 1024 * 1024) { onError("This file is too large to share as a new version. Choose a file under 11 MB."); return; }
      const reader = new FileReader();
      reader.onload = () => { onChange({ name: file.name, mime: file.type || "application/octet-stream", data: String(reader.result) }); onError(""); };
      reader.onerror = () => onError("The selected file could not be read.");
      reader.readAsDataURL(file);
    };
    return <div className="space-y-4">
      <SafeFilePreview content={content} title={doc.title} />
      {editable && <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#cbd8cf] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#e8f1ec]"><Upload className="h-4 w-4" />Replace file<input type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.bmp,.avif,.tif,.tiff,.pdf,.docx,.xlsx,.pptx,.mp3,.wav,.m4a,.aac,.ogg,.opus,.flac,.mp4,.webm,.mov,.m4v,.avi,.mkv" className="sr-only" onChange={e => { replaceFile(e.target.files?.[0]); e.currentTarget.value = ""; }} /></label>}
    </div>;
  }
  if (doc.kind === "image") {
    const imageData = parseStructuredContent(content);
    const images = collectImages(imageData, "", true);
    const replaceImage = (file?: File) => {
      if (!file) return;
      if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) { onError("Choose a PNG, JPEG, WebP, or GIF image."); return; }
      if (file.size > 11 * 1024 * 1024) { onError("Choose an image under 11 MB so the complete document stays below its 16 MB limit."); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const replacement = String(reader.result);
        const changed = typeof imageData === "string"
          ? { value: replacement, replaced: true }
          : replaceFirstImage(imageData, replacement, true);
        const next = changed.replaced ? changed.value : { ...(imageData && typeof imageData === "object" ? imageData : {}), imageUrl: replacement };
        onChange(wrapStructuredContent(content, next)); onError("");
      };
      reader.onerror = () => onError("The selected image could not be read.");
      reader.readAsDataURL(file);
    };
    return <div className="space-y-4">
      {images.length ? <div className={`grid gap-3 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>{images.map((src, index) => <img key={`${index}-${src.slice(0, 32)}`} src={src} alt={`${doc.title}, image ${index + 1}`} className="max-h-[65vh] w-full rounded-xl border border-[#d8dfd4] bg-white object-contain" />)}</div> : <div className="rounded-2xl border border-dashed border-[#cbd8cf] p-8 text-center text-sm text-[#617574]">No embedded image preview is available for this snapshot.</div>}
      {editable && <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#cbd8cf] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#e8f1ec]"><ImageIcon className="h-4 w-4" />Replace first image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={e => { replaceImage(e.target.files?.[0]); e.currentTarget.value = ""; }} /></label>}
    </div>;
  }
  if (editable) return typeof content === "string"
    ? <div className="space-y-3"><p className="text-sm text-[#617574]">Edit the text snapshot. Save explicitly to publish a new version.</p><Textarea aria-label="Shared content" className="min-h-[360px] bg-white" value={content} onChange={e => onChange(e.target.value)} /></div>
    : <StructuredEditor content={content} onChange={onChange} onValidity={setDraftValid} onError={onError} />;
  const body = typeof content === "string" ? content : content?.body;
  if (typeof body === "string") {
    const parsed = parseStructuredContent(body);
    if (parsed !== body) return <StructuredPreview kind={doc.kind} type={content?.type} data={parsed} includePrivate={doc.includePrivate} />;
    return <article className="prose prose-stone max-w-none whitespace-pre-wrap leading-7">{body}</article>;
  }
  return <StructuredPreview kind={doc.kind} type={content?.type} data={content} includePrivate={doc.includePrivate} />;
}

function StructuredEditor({ content, onChange, onValidity, onError }: { content: any; onChange: (value: any) => void; onValidity: (valid: boolean) => void; onError: (message: string) => void }) {
  const model = parseStructuredContent(content);
  const [text, setText] = useState(() => JSON.stringify(model, null, 2));
  const [valid, setValid] = useState(true);
  const emit = (next: any) => {
    onChange(wrapStructuredContent(content, next));
    setText(JSON.stringify(next, null, 2));
    setValid(true); onValidity(true); onError("");
  };
  return <div className="space-y-3">
    <p className="text-sm text-[#617574]">Edit the readable fields below, then save a new version when ready.</p>
    <FieldEditor name={typeof model === "string" ? "Body" : content?.type || "Document"} value={model} onChange={emit} onError={onError} />
    {valid || <p role="alert" className="text-sm text-[#9c452e]">Your structured edits are incomplete or invalid. Correct the field before saving.</p>}
    <details className="rounded-xl border border-[#d8dfd4] p-3">
      <summary className="cursor-pointer text-sm font-semibold">Advanced JSON</summary>
      <Textarea aria-label="Advanced structured document JSON" className="mt-3 min-h-[280px] bg-white font-mono text-xs" value={text} onChange={e => {
        const next = e.target.value; setText(next);
        try {
          const parsed = JSON.parse(next);
          emit(parsed);
        } catch { setValid(false); onValidity(false); }
      }} />
      {!valid && <p role="alert" className="mt-2 text-sm text-[#9c452e]">Fix the JSON before saving. The last valid structured data is preserved.</p>}
    </details>
  </div>;
}

function ImageValueEditor({ name, value, onChange, onError }: { name: string; value: string; onChange: (value: string) => void; onError: (message: string) => void }) {
  const imageSrc = /^data:image\//i.test(value)
    ? value
    : value.length > 128 && /^[A-Za-z0-9+/]+=*$/.test(value) ? `data:image/png;base64,${value}` : "";
  return <div className="space-y-2 rounded-xl border border-[#dce4d9] bg-white p-3">
    <p className="text-xs font-semibold capitalize text-[#617574]">{name.replace(/([A-Z])/g, " $1")}</p>
    {imageSrc ? <img src={imageSrc} alt={name} className="max-h-52 max-w-full rounded-lg object-contain" /> : <p className="text-xs text-[#617574]">This image reference is not embedded. Replace it to include a durable image in the next version.</p>}
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#cbd8cf] px-3 py-2 text-xs font-semibold hover:bg-[#e8f1ec]"><Upload className="h-3.5 w-3.5" />Upload replacement<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={e => {
      const file = e.target.files?.[0]; e.currentTarget.value = "";
      if (!file) return;
      if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) || file.size > 11 * 1024 * 1024) { onError("Choose a PNG, JPEG, WebP, or GIF image under 11 MB."); return; }
      const reader = new FileReader(); reader.onload = () => { onChange(String(reader.result)); onError(""); }; reader.onerror = () => onError("This image could not be read."); reader.readAsDataURL(file);
    }} /></label>
  </div>;
}

function FieldEditor({ name, value, onChange, onError, imageContext = false, depth = 0 }: {
  name: string; value: any; onChange: (next: any) => void; onError: (message: string) => void; imageContext?: boolean; depth?: number;
}) {
  const [newKey, setNewKey] = useState("");
  const imageField = imageContext || isImageKey(name);
  if (depth > 12) return <Textarea aria-label={name} value={JSON.stringify(value)} onChange={e => { try { onChange(JSON.parse(e.target.value)); } catch { onError("Enter valid JSON for this deeply nested field."); } }} className="font-mono text-xs" />;
  if (imageField && (value == null || (typeof value === "string" && looksLikeImageReference(value)))) return <ImageValueEditor name={name} value={String(value ?? "")} onChange={onChange} onError={onError} />;
  if (Array.isArray(value)) return <section className="space-y-2 rounded-xl border border-[#dce4d9] bg-[#f8f7f1] p-3">
    <div className="flex items-center justify-between gap-3"><h3 className="font-semibold capitalize">{name.replace(/([A-Z])/g, " $1")} <span className="text-xs font-normal text-[#617574]">({value.length})</span></h3><Button type="button" size="sm" variant="outline" onClick={() => onChange([...value, value.length ? structuredCloneSafe(value[0]) : ""])}>Add item</Button></div>
    {value.map((item, index) => <div key={`${name}-${index}`} className="flex items-start gap-2">
      <span className="mt-3 w-7 shrink-0 text-xs text-[#617574]">{index + 1}.</span>
      <div className="min-w-0 flex-1"><FieldEditor name={`${name} item ${index + 1}`} value={item} imageContext={imageField} depth={depth + 1} onError={onError} onChange={next => onChange(value.map((current, i) => i === index ? next : current))} /></div>
      <button type="button" aria-label={`Remove ${name} item ${index + 1}`} className="mt-2 rounded-lg p-2 text-[#9c452e] hover:bg-[#fff0e9]" onClick={() => onChange(value.filter((_, i) => i !== index))}><X className="h-4 w-4" /></button>
    </div>)}
  </section>;
  if (value && typeof value === "object") return <section className="space-y-3 rounded-xl border border-[#dce4d9] bg-[#f8f7f1] p-3">
    <h3 className="font-semibold capitalize">{name.replace(/([A-Z])/g, " $1")}</h3>
    {Object.entries(value).map(([key, child]) => <FieldEditor key={`${name}-${key}`} name={key} value={child} imageContext={isImagePayloadKey(key, imageField)} depth={depth + 1} onError={onError} onChange={next => onChange({ ...value, [key]: next })} />)}
    <div className="flex gap-2"><Input aria-label={`New field in ${name}`} placeholder="New field name" value={newKey} onChange={e => setNewKey(e.target.value)} className="bg-white" /><Button type="button" size="sm" variant="outline" disabled={!newKey.trim() || Object.prototype.hasOwnProperty.call(value, newKey.trim())} onClick={() => { onChange({ ...value, [newKey.trim()]: "" }); setNewKey(""); }}>Add field</Button></div>
  </section>;
  if (typeof value === "boolean") return <label className="flex items-center gap-3 rounded-lg border border-[#e0e5dc] bg-white px-3 py-2 text-sm"><input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} className="accent-[#2f7472]" /><span className="capitalize">{name.replace(/([A-Z])/g, " $1")}</span></label>;
  if (typeof value === "number") return <label className="block text-sm capitalize">{name.replace(/([A-Z])/g, " $1")}<Input type="number" value={value} onChange={e => onChange(e.target.value === "" ? 0 : Number(e.target.value))} className="mt-1 bg-white" /></label>;
  if (typeof value === "string" && (value.length > 140 || /body|description|prompt|content|text/i.test(name))) return <label className="block text-sm capitalize">{name.replace(/([A-Z])/g, " $1")}<Textarea value={value} onChange={e => onChange(e.target.value)} className="mt-1 min-h-24 bg-white" /></label>;
  return <label className="block text-sm capitalize">{name.replace(/([A-Z])/g, " $1")}<Input value={String(value ?? "")} onChange={e => onChange(e.target.value)} className="mt-1 bg-white" /></label>;
}

function structuredCloneSafe(value: any): any {
  if (value === null || typeof value !== "object") return value;
  return Array.isArray(value) ? value.map(structuredCloneSafe) : Object.fromEntries(Object.entries(value).map(([key, child]) => [key, structuredCloneSafe(child)]));
}

function StructuredPreview({ kind, type, data, includePrivate }: { kind: string; type?: string; data: any; includePrivate: boolean }) {
  const previewType = data?.type === "presentation" || data?.type === "storyboard" || data?.type === "worksheet" ? data.type : type;
  if (previewType === "presentation" || (kind === "presentation" && Array.isArray(data?.slides))) {
    const slides = Array.isArray(data?.slides) ? data.slides : [];
    return <div className="space-y-5"><h2 className="bb-display text-2xl font-bold">{data.title || "Presentation"}</h2>{slides.map((slide: any, index: number) => <section key={index} className="space-y-3 rounded-2xl border border-[#d8dfd4] bg-[#f8f7f1] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#bf6d45]">Slide {index + 1}</p>{slide.title && <h3 className="text-xl font-bold">{slide.title}</h3>}<SafeStructured data={slide} includePrivate={includePrivate} /></section>)}</div>;
  }
  if (previewType === "storyboard" || (kind === "storyboard" && Array.isArray(data?.frames))) {
    const frames = Array.isArray(data?.frames) ? data.frames : [];
    return <div className="space-y-5"><h2 className="bb-display text-2xl font-bold">{data.title || "Storyboard"}</h2>{frames.map((frame: any, index: number) => <section key={index} className="space-y-3 rounded-2xl border border-[#d8dfd4] bg-[#f8f7f1] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#bf6d45]">Frame {index + 1}</p>{frame.title && <h3 className="text-xl font-bold">{frame.title}</h3>}<SafeStructured data={frame} includePrivate={includePrivate} /></section>)}</div>;
  }
  if ((previewType === "worksheet" || kind === "worksheet") && data?.layout === "wordSearch") return <WordSearchPreview key={`${data.title}:${JSON.stringify(data.grid)}`} puzzle={data} />;
  if (previewType === "worksheet" || kind === "worksheet") return <div className="rounded-2xl bg-[#f8f7f1] p-4"><h2 className="bb-display mb-4 text-2xl font-bold">{data?.title || "Worksheet"}</h2><SafeStructured data={data} includePrivate={includePrivate} /></div>;
  return <SafeStructured data={data} includePrivate={includePrivate} />;
}

function SafeStructured({ data, includePrivate = false, fieldKey = "", imageContext = false }: { data: any; includePrivate?: boolean; fieldKey?: string; imageContext?: boolean }) {
  if (data === null || data === undefined) return <p className="text-[#617574]">No preview is available for this document.</p>;
  if (typeof data === "string") {
    if (/^data:image\//i.test(data)) return <img src={data} alt={fieldKey || "Shared illustration"} className="max-h-96 max-w-full rounded-xl object-contain" />;
    if ((imageContext || isImageKey(fieldKey)) && data.length > 128 && /^[A-Za-z0-9+/]+=*$/.test(data)) return <img src={`data:image/png;base64,${data}`} alt={fieldKey || "Shared illustration"} className="max-h-96 max-w-full rounded-xl object-contain" />;
    if ((imageContext || isImageKey(fieldKey)) && (/^https?:\/\//i.test(data) || /^(?:\/|\.\/)/.test(data))) return <p className="rounded-lg bg-[#f1eee4] p-3 text-xs text-[#617574]">Image preview is unavailable; this field is not embedded.</p>;
    return <p className="whitespace-pre-wrap leading-7">{data}</p>;
  }
  if (typeof data === "number" || typeof data === "boolean") return <p className="whitespace-pre-wrap leading-7">{String(data)}</p>;
  if (Array.isArray(data)) return <div className="space-y-3">{data.map((v, i) => <div key={i} className="rounded-xl border border-[#e0e5dc] p-4"><SafeStructured data={v} includePrivate={includePrivate} fieldKey={fieldKey} imageContext={imageContext || isImageKey(fieldKey)} /></div>)}</div>;
  return <div className="space-y-4">{Object.entries(data).filter(([k]) => includePrivate || !isPrivateShareKey(k)).map(([k, v]) => {
    const imageField = isImagePayloadKey(k, imageContext);
    return <section key={k} className="space-y-1"><h3 className="text-xs font-bold uppercase tracking-wider text-[#617574]">{k.replace(/([A-Z])/g, " $1")}</h3><SafeStructured data={v} includePrivate={includePrivate} fieldKey={k} imageContext={imageField} /></section>;
  })}</div>;
}

export default function SharedDocumentPage() {
  const queryClient = useQueryClient();
  const [, params] = useRoute("/share/:id");
  const id = params?.id || "";
  const [location, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const search = useSearch();
  const revision = useMemo(() => new URLSearchParams(search).get("revision") || "", [search]);
  const [doc, setDoc] = useState<SharedDetail | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [draftValid, setDraftValid] = useState(true);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"loading" | "error" | "expired" | "forbidden" | "ready">("loading");
  const [error, setError] = useState("");
  const [canRequest, setCanRequest] = useState(false);
  const [recovery, setRecovery] = useState<{ content: any; title: string; revision: string } | null>(null);
  const [draftBase, setDraftBase] = useState("");
  const recoveryKey = `brightboard-shared-draft:${user?.id}:${id}`;
  const [requestMessage, setRequestMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("viewer");
  const [revisionQr, setRevisionQr] = useState("");
  const [settings, setSettings] = useState<ShareOptions>({ audience: "invited", allowRequests: false, allowDownload: false, includePrivate: false, expiresAt: null });
  const load = useCallback(async (rev = revision) => {
    setStatus("loading"); setError("");
    try {
      const query = rev ? `?revision=${encodeURIComponent(rev)}` : "";
      const result = await sharingRequest<SharedDetail>(`/api/sharing/documents/${id}${query}`);
      setDoc(result); setDraft(result.content); setTitle(result.title);
      setDraftBase(result.latestRevision);
      if (!rev && ["owner", "editor"].includes(result.role)) {
        try {
          const previous = JSON.parse(sessionStorage.getItem(recoveryKey) || "null");
          setRecovery(previous && (JSON.stringify(previous.content) !== JSON.stringify(result.content) || previous.title !== result.title) ? previous : null);
        } catch { setRecovery(null); }
      }
      setDraftValid(true);
      setSettings({ audience: result.audience, allowRequests: result.allowRequests, allowDownload: result.allowDownload, includePrivate: result.includePrivate, expiresAt: result.expiresAt });
      setStatus("ready");
    } catch (e) {
      if (e instanceof SharingError && e.status === 403) { setCanRequest(e.canRequest); setStatus("forbidden"); }
      else if (e instanceof SharingError && e.status === 410) { setStatus("expired"); setError(e.message); }
      else { setStatus("error"); setError(e instanceof Error ? e.message : "Could not open this document."); }
    }
  }, [id, revision, recoveryKey]);
  useEffect(() => { if (id) void load(); }, [id, load]);
  useEffect(() => {
    if (!doc?.revision) return;
    let active = true;
    setRevisionQr("");
    void QRCode.toDataURL(stableShareUrl(doc.id, doc.revision), {
      width: 192, margin: 1, color: { dark: "#183c40", light: "#f8f6ef" },
    }).then(image => { if (active) setRevisionQr(image); }).catch(() => { if (active) setRevisionQr(""); });
    return () => { active = false; };
  }, [doc?.id, doc?.revision]);
  const editable = !!doc && !revision && (doc.role === "owner" || doc.role === "editor") && doc.revision === doc.latestRevision;
  const dirty = editable && (JSON.stringify(draft) !== JSON.stringify(doc?.content) || title !== doc?.title);
  useEffect(() => {
    if (!dirty) return;
    const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", leave);
    const timer = window.setTimeout(() => {
      try { sessionStorage.setItem(recoveryKey, JSON.stringify({ content: draft, title, revision: draftBase })); }
      catch { setError("Your browser could not save a recovery draft. Keep this tab open until you publish or save a separate backup."); }
    }, 400);
    return () => { clearTimeout(timer); window.removeEventListener("beforeunload", leave); };
  }, [dirty, draft, title, draftBase, recoveryKey]);
  const isOwner = doc?.role === "owner";
  const currentRevisionUrl = doc ? stableShareUrl(doc.id, doc.revision) : "";
  const currentStableUrl = doc ? stableShareUrl(doc.id) : "";
  const act = async (fn: () => Promise<any>, message?: string) => {
    setBusy(true); setError(""); setNotice("");
    try { const result = await fn(); if (message) setNotice(message); return result; }
    catch (e) { if (e instanceof SharingError && e.status === 409) setConflict(true); setError(e instanceof Error ? e.message : "That action could not be completed."); return null; }
    finally { setBusy(false); void queryClient.invalidateQueries({ queryKey: ["sharing", "documents"] }); }
  };
  const save = () => void act(async () => {
  const safeContent = await prepareShareSnapshot(draft, doc!.kind, doc!.includePrivate);
    await sharingRequest(`/api/sharing/documents/${id}`, { method: "PUT", headers: { "If-Match": draftBase || doc!.latestRevision }, body: JSON.stringify({ content: safeContent, title }) });
    const updated = await sharingRequest<SharedDetail>(`/api/sharing/documents/${id}`);
    setDoc(updated); setDraft(updated.content); setDraftBase(updated.latestRevision); setRecovery(null); setConflict(false); setNotice("New version saved.");
    try { sessionStorage.removeItem(recoveryKey); } catch { /* Published source is already safely stored. */ }
  });
  const download = async () => {
    await act(async () => {
      const response = await fetch(`/api/sharing/documents/${id}/export${revision ? `?revision=${encodeURIComponent(revision)}` : ""}`, { credentials: "include" });
      if (response.status === 401) { window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`); throw new Error("Sign in to download."); }
      if (!response.ok) { let b: any; try { b = await response.json(); } catch {} throw new Error(b?.error || `Download failed (${response.status}).`); }
      const blob = await response.blob(), url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = `${(doc?.title || "brightboard-document").replace(/[^\w.-]+/g, "-")}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
    });
  };
  const downloadOriginal = async () => {
    await act(async () => {
      const file = doc?.content;
      if (!file?.data || !/^data:[^;,]+;base64,/i.test(file.data)) throw new Error("The original file is not available as a self-contained snapshot.");
      const response = await fetch(file.data);
      const blob = await response.blob();
      const safeName = String(file.name || doc?.title || "brightboard-file")
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/^\.+/, "").slice(0, 140) || "brightboard-file";
      const url = URL.createObjectURL(blob), anchor = document.createElement("a");
      anchor.href = url; anchor.download = safeName; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    });
  };
  const fork = () => void act(async () => {
    const response = await sharingRequest<{ id: string }>(`/api/sharing/documents/${id}/fork`, { method: "POST", body: JSON.stringify({}) });
    setLocation(`/share/${response.id}`); setNotice("A copy was created.");
  });
  const settingsPayload = (enabled?: boolean) => ({
    audience: settings.audience,
    allowRequests: settings.allowRequests,
    allowDownload: settings.allowDownload,
    expiresAt: settings.expiresAt,
    ...(enabled === undefined ? {} : { enabled }),
  });
  const publicSettings = () => void act(async () => {
    await sharingRequest(`/api/sharing/documents/${id}`, { method: "PATCH", body: JSON.stringify(settingsPayload()) });
    const updated = await sharingRequest<SharedDetail>(`/api/sharing/documents/${id}`);
    setDoc(updated); setNotice("Sharing settings saved.");
  });
  const requestAccess = () => void act(async () => {
    await sharingRequest(`/api/sharing/documents/${id}/requests`, { method: "POST", body: JSON.stringify({ message: requestMessage }) });
    setNotice("Access request sent."); setCanRequest(false);
  });
  const respondRequest = (userId: string, decision: "approve" | "decline") => void act(async () => {
    await sharingRequest(`/api/sharing/documents/${id}/requests/${userId}`, { method: "POST", body: JSON.stringify({ decision }) });
    const updated = await sharingRequest<SharedDetail>(`/api/sharing/documents/${id}`);
    setDoc(updated);
  });
  const invite = () => void act(async () => {
    await sharingRequest(`/api/sharing/documents/${id}/members`, { method: "POST", body: JSON.stringify({ email: inviteEmail, role: inviteRole }) });
    const updated = await sharingRequest<SharedDetail>(`/api/sharing/documents/${id}`);
    setDoc(updated); setInviteEmail("");
  });
  const revoke = (memberId: string) => void act(async () => {
    await sharingRequest(`/api/sharing/documents/${id}/members/${memberId}`, { method: "DELETE" }); await load();
  });
  const copyLink = async (url: string, label: string) => {
    try { await navigator.clipboard.writeText(url); setNotice(`${label} copied.`); setError(""); }
    catch { setError("Clipboard unavailable. Select and copy the link manually."); }
  };
  const removeDocument = () => {
    if (!window.confirm("Delete this shared document and its versions? This cannot be undone.")) return;
    void act(async () => { await sharingRequest(`/api/sharing/documents/${id}`, { method: "DELETE" }); setLocation("/shared"); });
  };

  return <><main className="min-h-[70dvh] bg-[#f4f3ec] px-4 py-8 text-[#183c40] md:px-8">
    <div className="mx-auto max-w-6xl">
      <Link href="/shared" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#52716e] hover:text-[#183c40]"><ArrowLeft className="h-4 w-4" />All shared documents</Link>
      {status === "loading" && <div className="space-y-4"><div className="h-9 w-1/2 animate-pulse rounded-lg bg-[#e2e6dc]" /><div className="h-96 animate-pulse rounded-3xl bg-[#e2e6dc]" /></div>}
      {(status === "error" || status === "expired") && <section className="rounded-3xl border border-[#d8dfd4] bg-[#fbfaf5] p-8"><LockKeyhole className="h-8 w-8 text-[#bf6d45]" /><h1 className="bb-display mt-4 text-3xl font-bold">{status === "expired" ? "This link has expired" : "We couldn’t open this document"}</h1><p role="alert" className="mt-2 text-[#617574]">{error}</p><Button className="mt-5" variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></section>}
      {status === "forbidden" && <section className="mx-auto max-w-xl rounded-3xl border border-[#d8dfd4] bg-[#fbfaf5] p-8"><LockKeyhole className="h-8 w-8 text-[#bf6d45]" /><p className="mt-4 text-xs font-bold uppercase tracking-[.18em] text-[#bf6d45]">Private document</p><h1 className="bb-display mt-2 text-3xl font-bold">Access needed</h1><p className="mt-2 text-[#617574]">The owner hasn’t shared this document with your account. Its title and contents stay private.</p>{canRequest && isAuthenticated ? <div className="mt-5 space-y-3"><Label htmlFor="access-message">Add a note (optional)</Label><Textarea id="access-message" value={requestMessage} onChange={e => setRequestMessage(e.target.value)} maxLength={500} placeholder="Let the owner know why you need access." /><Button onClick={requestAccess} disabled={busy}><Send className="mr-2 h-4 w-4" />Request access</Button></div> : !isAuthenticated ? <Link href={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`} className="mt-5 inline-flex rounded-xl bg-[#2f7472] px-5 py-3 font-semibold text-white">Sign in to request access</Link> : <p className="mt-5 text-sm text-[#617574]">This link does not accept access requests.</p>}</section>}
      {status === "ready" && doc && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
        <section className="min-w-0">
          <div className="mb-5 rounded-3xl border border-[#d8dfd4] bg-[#fbfaf5] p-5 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e8f1ec] px-3 py-1 text-xs font-bold capitalize text-[#2f7472]">{doc.kind}</span><span className="rounded-full bg-[#f1e7dc] px-3 py-1 text-xs font-semibold capitalize text-[#9c5c3e]">{doc.role}</span>{revision && <span className="rounded-full bg-[#e6e9df] px-3 py-1 text-xs">Version history</span>}</div>{editable ? <Input aria-label="Document title" value={title} onChange={e => setTitle(e.target.value)} maxLength={160} className="bb-display mt-4 border-0 bg-transparent px-0 text-3xl font-bold shadow-none focus-visible:ring-0 md:text-4xl" /> : <h1 className="bb-display mt-4 break-words text-3xl font-bold md:text-4xl">{doc.title}</h1>}<p className="mt-2 flex items-center gap-2 text-sm text-[#617574]"><Clock3 className="h-4 w-4" />Updated {new Date(doc.updatedAt).toLocaleString()}</p></div>
              <div className="flex flex-wrap gap-2">{editable && <Button onClick={save} disabled={busy || !doc || !!revision || !draftValid}><Save className="mr-2 h-4 w-4" />Save version</Button>}{doc.kind === "file" && (doc.allowDownload || isOwner) && <Button variant="outline" onClick={downloadOriginal} disabled={busy}><Download className="mr-2 h-4 w-4" />Download original</Button>}{(doc.allowDownload || isOwner) && <Button variant="outline" onClick={download} disabled={busy}><Download className="mr-2 h-4 w-4" />Download backup</Button>}{(doc.allowDownload || isOwner) && <Button variant="outline" onClick={fork} disabled={busy}><GitFork className="mr-2 h-4 w-4" />Make a copy</Button>}</div>
            </div>
            {conflict && <div role="alert" className="mt-5 rounded-xl border border-[#dba17e] bg-[#fff0e9] p-4 text-sm"><strong>Someone saved a newer version.</strong><p className="mt-1">Your draft is still here. Reload the latest version and discard this draft, or copy your draft before continuing.</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Reload latest (discard draft)</Button><Button size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(typeof draft === "string" ? draft : JSON.stringify(draft, null, 2)); setNotice("Draft copied to clipboard."); } catch { setError("Clipboard unavailable. Your draft remains in the editor."); } }}>Copy draft</Button></div></div>}
          </div>
          {error && <p role="alert" className="mb-4 rounded-xl border border-[#d89a80] bg-[#fff0e9] p-3 text-sm text-[#9c452e]">{error}</p>}{notice && <p role="status" className="mb-4 rounded-xl bg-[#e4efe7] p-3 text-sm text-[#2f6459]"><Check className="mr-2 inline h-4 w-4" />{notice}</p>}
          {editable && recovery && <section className="mb-5 rounded-xl border p-4"><h2 className="font-semibold">An unpublished recovery draft is available</h2><p className="my-2 text-sm">Restore your draft without publishing it. If the shared document changed meanwhile, publishing will require resolving the version conflict.</p><Button variant="outline" onClick={() => { setDraft(recovery.content); setTitle(recovery.title); setDraftBase(recovery.revision); setRecovery(null); }}>Restore draft</Button><Button variant="ghost" onClick={() => { setRecovery(null); try { sessionStorage.removeItem(recoveryKey); } catch {} }}>Discard recovery draft</Button></section>}
          {doc.role === "viewer" && !isAuthenticated && <section className="mb-5 rounded-2xl border border-[#d8dfd4] bg-[#fbfaf5] p-5"><h2 className="font-semibold">View freely. Sign in to edit.</h2><p className="mt-2 text-sm">Editing requires the owner's approval. Your document and version will be preserved when you sign in.</p><Link href={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)}`} className="mt-3 inline-flex rounded-xl bg-[#2f7472] px-5 py-3 font-semibold text-white">Edit · Sign in or sign up</Link></section>}
          {doc.role === "viewer" && doc.allowRequests && isAuthenticated && <section className="mb-5 rounded-2xl border border-[#d8dfd4] bg-[#fbfaf5] p-5">
            <h2 className="font-semibold">Ask the owner for editing access</h2><p className="mt-1 text-sm text-[#617574]">You can view this document. Editing requires approval for your signed-in account.</p>
            <Label htmlFor="viewer-access-message" className="mt-3 block">Message (optional)</Label><Textarea id="viewer-access-message" maxLength={1000} value={requestMessage} onChange={e => setRequestMessage(e.target.value)} />
            <Button className="mt-3" disabled={busy} onClick={requestAccess}>Request editing access</Button>
          </section>}
          {!doc.allowDownload && !isOwner && <p className="mb-4 rounded-xl border border-[#e8c9b6] bg-[#fbf0e8] p-3 text-sm text-[#7d4c38]">Downloads are disabled for this share. Content shown in your browser can still be captured by screenshots; access settings cannot prevent that.</p>}
          <article className="min-h-[360px] overflow-hidden rounded-3xl border border-[#d8dfd4] bg-[#fbfaf5] p-5 md:p-8"><SharedContent doc={doc} content={draft} editable={editable} onChange={setDraft} onError={setError} setDraftValid={setDraftValid} /></article>
        </section>
        <aside className="space-y-5">
          <section className="rounded-3xl border border-[#d8dfd4] bg-[#fbfaf5] p-5"><h2 className="flex items-center gap-2 font-semibold"><History className="h-4 w-4 text-[#bf6d45]" />Versions</h2><p className="mt-1 text-xs text-[#617574]">Saved snapshots; no live co-editing.</p><div className="mt-4 space-y-2">{doc.versions.map(v => <Link key={v.revision} href={`/share/${doc.id}?revision=${encodeURIComponent(v.revision)}`} className={`block rounded-xl border p-3 text-sm hover:border-[#88aaa0] ${v.revision === doc.revision ? "border-[#78a39a] bg-[#e8f1ec]" : "border-[#e0e5dc]"}`}><span className="block font-medium">{new Date(v.createdAt).toLocaleString()}</span><span className="mt-1 block text-xs text-[#617574]">{v.authorName}{v.revision === doc.latestRevision ? " · Latest" : ""}</span></Link>)}</div></section>
          {(isOwner || (doc.requests || []).some(r => r.status === "pending")) && <section className="rounded-3xl border border-[#d8dfd4] bg-[#fbfaf5] p-5"><h2 className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4 text-[#bf6d45]" />Access requests</h2>{(doc.requests || []).filter(r => r.status === "pending").length === 0 ? <p className="mt-3 text-sm text-[#617574]">No pending requests.</p> : <div className="mt-3 space-y-3">{(doc.requests || []).filter(r => r.status === "pending").map(r => <div key={r.userId} className="rounded-xl border border-[#e0e5dc] p-3"><p className="font-medium">{r.name}</p><p className="mt-1 text-sm text-[#617574]">{r.message || "No note included."}</p>{isOwner && <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => respondRequest(r.userId, "approve")}>Approve</Button><Button size="sm" variant="outline" onClick={() => respondRequest(r.userId, "decline")}>Decline</Button></div>}</div>)}</div>}</section>}
          {isOwner && <section className="rounded-3xl border border-[#d8dfd4] bg-[#fbfaf5] p-5"><h2 className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4 text-[#bf6d45]" />People</h2><form className="mt-3 space-y-2" onSubmit={e => { e.preventDefault(); invite(); }}><Input type="email" placeholder="colleague@school.org" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required aria-label="Invite email" /><div className="flex gap-2"><select aria-label="Invite role" value={inviteRole} onChange={e => setInviteRole(e.target.value as "viewer" | "editor")} className="min-w-0 flex-1 rounded-lg border border-[#cbd8cf] bg-white px-2 text-sm"><option value="viewer">Viewer</option><option value="editor">Editor</option></select><Button size="sm" type="submit" disabled={busy || !inviteEmail}>Invite</Button></div></form><ul className="mt-4 divide-y divide-[#e0e5dc]">{(doc.members || []).map(m => <li key={m.id} className="flex items-center justify-between gap-2 py-2 text-sm"><span className="min-w-0 break-all">{m.email}<small className="block capitalize text-[#617574]">{m.role}</small></span><button type="button" aria-label={`Revoke ${m.email}`} onClick={() => revoke(m.id)} className="rounded-lg p-2 text-[#a45636] hover:bg-[#fff0e9]"><X className="h-4 w-4" /></button></li>)}</ul></section>}
          {isOwner && <section className="rounded-3xl border border-[#d8dfd4] bg-[#fbfaf5] p-5"><h2 className="flex items-center gap-2 font-semibold"><Settings2 className="h-4 w-4 text-[#bf6d45]" />Sharing settings</h2><div className="mt-4 space-y-3 text-sm"><label className="flex gap-2"><input type="radio" checked={settings.audience === "invited"} onChange={() => setSettings(s => ({ ...s, audience: "invited" }))} />Invited only</label><label className="flex gap-2"><input type="radio" checked={settings.audience === "link"} onChange={() => setSettings(s => ({ ...s, audience: "link" }))} />Anyone with link</label><label className="flex gap-2"><input type="checkbox" checked={settings.allowRequests} onChange={e => setSettings(s => ({ ...s, allowRequests: e.target.checked }))} />Allow access requests</label><label className="flex gap-2"><input type="checkbox" checked={settings.allowDownload} onChange={e => setSettings(s => ({ ...s, allowDownload: e.target.checked }))} />Allow download and copy</label><label className="block">Expiry (optional)<Input type="datetime-local" className="mt-1 bg-white" value={settings.expiresAt ? new Date(new Date(settings.expiresAt).getTime() - new Date(settings.expiresAt).getTimezoneOffset() * 60000).toISOString().slice(0,16) : ""} onChange={e => setSettings(s => ({ ...s, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null }))} /></label></div><p className="mt-3 rounded-xl bg-[#f1eee4] p-3 text-xs text-[#617574]">Private notes and answer keys are {doc.includePrivate ? "included" : "excluded"} in this snapshot. To change that, create and publish a new share from the source.</p><Button className="mt-4 w-full" variant="outline" onClick={publicSettings} disabled={busy}>Save settings</Button><Button className="mt-2 w-full" variant="outline" onClick={() => void act(async () => { await sharingRequest(`/api/sharing/documents/${id}`, { method: "PATCH", body: JSON.stringify(settingsPayload(!doc.enabled)) }); setDoc(await sharingRequest<SharedDetail>(`/api/sharing/documents/${id}`)); })}>{doc.enabled ? "Disable share link" : "Enable share link"}</Button><Button className="mt-2 w-full text-[#9c452e]" variant="outline" onClick={removeDocument}>Delete document</Button></section>}
          <section className="rounded-3xl border border-[#d8dfd4] bg-[#fbfaf5] p-5 text-sm">
            <h2 className="flex items-center gap-2 font-semibold"><MessageSquare className="h-4 w-4 text-[#2f7472]" />Share links</h2>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-[#617574]">This version</p>
            <Input readOnly aria-label="Current revision link" value={currentRevisionUrl} className="mt-1 bg-white font-mono text-[11px]" />
            <div className="mt-3 flex items-center gap-3">
              {revisionQr ? <img src={revisionQr} alt="QR code for this exact document version" className="h-24 w-24 rounded-lg border border-[#d8dfd4] bg-[#f8f6ef] p-1" /> : <div className="grid h-24 w-24 place-items-center rounded-lg border border-dashed border-[#cbd8cf] text-center text-[10px] text-[#617574]">Preparing<br />version QR</div>}
              <div className="flex flex-col items-start gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => void copyLink(currentRevisionUrl, "Version link")}><LinkIcon className="mr-2 h-4 w-4" />Copy version link</Button>
                {revisionQr && <a href={revisionQr} download={`brightboard-${doc.id}-${doc.revision}.png`} className="inline-flex items-center rounded-lg border border-[#cbd8cf] px-3 py-2 text-xs font-semibold hover:bg-[#e8f1ec]">Download version QR</a>}
              </div>
            </div>
            <div className="mt-5 border-t border-[#dfe5dc] pt-4">
              <p className="font-semibold">Stable link</p>
              <p className="mt-1 break-all text-xs text-[#617574]">{currentStableUrl}</p>
              <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => void copyLink(currentStableUrl, "Stable link")}><LinkIcon className="mr-2 h-4 w-4" />Copy stable link</Button>
            </div>
          </section>
        </aside>
      </div>}
    </div>
  </main><Footer /></>;
}
