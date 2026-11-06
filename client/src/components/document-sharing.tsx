import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Link as LinkIcon, Copy, Check, Loader2, Users, Globe2, LockKeyhole, CalendarDays, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { SharingError, prepareShareSnapshot, sharingRequest, stableShareUrl, type ShareKind, type ShareOptions, type SharedDetail, type SharedDocument } from "@/lib/sharing";

type ShareSource = { kind: string; title: string; content: any };

function ShareDialogInternal({ open, onOpenChange, source, onPublished }: { open: boolean; onOpenChange: (open: boolean) => void; source: ShareSource; onPublished?: () => void }) {
  const { isAuthenticated } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<ShareOptions>({ audience: "invited", allowRequests: false, allowDownload: false, includePrivate: false, expiresAt: null });
  const [ownedDocuments, setOwnedDocuments] = useState<SharedDocument[] | null>(null);
  const [targetId, setTargetId] = useState("new");
  const [targetDetail, setTargetDetail] = useState<SharedDetail | null>(null);
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState<SharedDetail | null>(null);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState("");
  const [name, setName] = useState(source.title || "Untitled document");
  const wasOpen = useRef(false);
  const createdSourceKey = useRef<string | null>(null);
  const sourceKey = () => JSON.stringify([source.kind, source.title, source.content]);
  useEffect(() => {
    if (open && !wasOpen.current) {
      if (document && createdSourceKey.current === sourceKey()) {
        setName(document.title);
        setOptions({ audience: document.audience, allowRequests: document.allowRequests, allowDownload: document.allowDownload, includePrivate: document.includePrivate, expiresAt: document.expiresAt });
        setTargetId(document.id);
        setTargetDetail(document);
        void sharingRequest<SharedDetail>(`/api/sharing/documents/${document.id}`)
          .then(latest => { setDocument(latest); setTargetDetail(latest); setOptions({ audience: latest.audience, allowRequests: latest.allowRequests, allowDownload: latest.allowDownload, includePrivate: latest.includePrivate, expiresAt: latest.expiresAt }); })
          .catch(e => setError(e instanceof Error ? e.message : "Could not refresh this share."));
      } else {
        setDocument(null); setQr(""); setCopied(false); setEmail(""); setError("");
        setOwnedDocuments(null); setTargetId("new"); setTargetDetail(null);
        setOptions({ audience: "invited", allowRequests: false, allowDownload: false, includePrivate: false, expiresAt: null });
        setName(source.title || "Untitled document");
        if (isAuthenticated) {
          void sharingRequest<{ documents: SharedDocument[] }>("/api/sharing/documents")
            .then(result => setOwnedDocuments((result.documents || []).filter(item => item.role === "owner" && item.kind === source.kind)))
            .catch(e => setError(e instanceof Error ? e.message : "Could not load your existing shares."));
        } else setOwnedDocuments([]);
      }
    }
    wasOpen.current = open;
  }, [open, source.title, source.kind, source.content, document, isAuthenticated]);

  const chooseTarget = async (id: string) => {
    setTargetId(id); setError("");
    if (id === "new") {
      setTargetDetail(null);
      setName(source.title || "Untitled document");
      setOptions({ audience: "invited", allowRequests: false, allowDownload: false, includePrivate: false, expiresAt: null });
      return;
    }
    setBusy(true); setTargetDetail(null);
    try {
      const detail = await sharingRequest<SharedDetail>(`/api/sharing/documents/${id}`);
      if (detail.role !== "owner" || detail.kind !== source.kind) throw new Error("Choose an owned share of the same document type.");
      setTargetDetail(detail); setName(detail.title);
      setOptions({ audience: detail.audience, allowRequests: detail.allowRequests, allowDownload: detail.allowDownload, includePrivate: detail.includePrivate, expiresAt: detail.expiresAt });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not open that share."); }
    finally { setBusy(false); }
  };

  const create = async () => {
    setBusy(true); setError("");
    try {
      const safeContent = await prepareShareSnapshot(source.content, source.kind, targetId === "new" ? options.includePrivate : !!targetDetail?.includePrivate);
      let detail: SharedDetail;
      if (targetId === "new") {
        detail = await sharingRequest<SharedDetail>("/api/sharing/documents", {
          method: "POST", body: JSON.stringify({ kind: source.kind, title: name.trim() || "Untitled document", content: safeContent, ...options }),
        });
      } else {
        if (!targetDetail) throw new Error("Load the selected share before publishing.");
        await sharingRequest(`/api/sharing/documents/${targetDetail.id}`, {
          method: "PUT",
          headers: { "If-Match": targetDetail.latestRevision },
          body: JSON.stringify({ content: safeContent, title: name.trim() || targetDetail.title }),
        });
        detail = await sharingRequest<SharedDetail>(`/api/sharing/documents/${targetDetail.id}`);
      }
      createdSourceKey.current = sourceKey();
      setDocument(detail);
      setTargetDetail(detail); setTargetId(detail.id);
      setOptions({ audience: detail.audience, allowRequests: detail.allowRequests, allowDownload: detail.allowDownload, includePrivate: detail.includePrivate, expiresAt: detail.expiresAt });
      onPublished?.();
      const image = await QRCode.toDataURL(stableShareUrl(detail.id), { width: 180, margin: 1, color: { dark: "#183c40", light: "#f8f6ef" } });
      setQr(image);
    } catch (e) {
      if (e instanceof SharingError && e.status === 409 && targetDetail) {
        try {
          const latest = await sharingRequest<SharedDetail>(`/api/sharing/documents/${targetDetail.id}`);
          setTargetDetail(latest);
          setOptions({ audience: latest.audience, allowRequests: latest.allowRequests, allowDownload: latest.allowDownload, includePrivate: latest.includePrivate, expiresAt: latest.expiresAt });
          setError("A newer revision was saved first. The latest version is loaded; compare it with your source, then explicitly publish again. Nothing was overwritten.");
        } catch { setError("This share changed after you opened it. Reload the share before retrying; nothing was overwritten."); }
      }
      else setError(e instanceof Error ? e.message : "Could not create a share.");
    }
    finally { setBusy(false); }
  };
  const update = async () => {
    if (!document) return;
    setBusy(true); setError("");
    try {
      await sharingRequest(`/api/sharing/documents/${document.id}`, { method: "PATCH", body: JSON.stringify({
        audience: options.audience, allowRequests: options.allowRequests, allowDownload: options.allowDownload, expiresAt: options.expiresAt,
      }) });
      const detail = await sharingRequest<SharedDetail>(`/api/sharing/documents/${document.id}`);
      setDocument(detail);
      setOptions(current => ({ ...current, audience: detail.audience, allowRequests: detail.allowRequests, allowDownload: detail.allowDownload, expiresAt: detail.expiresAt, includePrivate: detail.includePrivate }));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update sharing."); }
    finally { setBusy(false); }
  };
  const invite = async () => {
    if (!document || !email.trim()) return;
    setBusy(true); setError("");
    try {
      await sharingRequest(`/api/sharing/documents/${document.id}/members`, { method: "POST", body: JSON.stringify({ email: email.trim(), role: "viewer" }) });
      const next = await sharingRequest<SharedDetail>(`/api/sharing/documents/${document.id}`);
      setDocument(next); setEmail("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not invite this person."); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    if (!document) return;
    try { await navigator.clipboard.writeText(stableShareUrl(document.id)); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setError("Clipboard unavailable. Copy the link from the address below."); }
  };
  const close = () => { onOpenChange(false); setError(""); };
  if (!open) return null;
  return <>
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#142d30]/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="share-dialog-title" className="w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-3xl border border-[#d8dfd4] bg-[#fbfaf5] text-[#183c40] shadow-2xl">
        <header className="flex items-start justify-between border-b border-[#dfe5dc] p-6">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#bf6d45]">BrightBoard · share</p><h2 id="share-dialog-title" className="bb-display mt-2 text-2xl font-bold">{document ? "Your link is ready" : "Share a document"}</h2><p className="mt-1 text-sm text-[#617574]">A deliberate snapshot, never a live collaboration session.</p></div>
          <button type="button" onClick={close} className="rounded-full p-2 hover:bg-[#e9eee6]" aria-label="Close"><X className="h-5 w-5" /></button>
        </header>
        <div className="space-y-5 p-6">
          {!document ? <>
            {!isAuthenticated ? <div className="rounded-xl border border-[#e8c9b6] bg-[#fbf0e8] p-4 text-sm">Sign in to create and manage document shares. Your work stays here until you publish it.<Link href={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`} className="ml-2 font-semibold text-[#2f7472] underline">Sign in</Link></div> : <>
              <div>
                <Label htmlFor="share-destination">Publish destination</Label>
                <select id="share-destination" value={targetId} onChange={e => void chooseTarget(e.target.value)} disabled={busy} className="mt-1 w-full rounded-lg border border-[#cbd8cf] bg-white px-3 py-2.5 text-sm">
                  <option value="new">Create a new share</option>
                  {(ownedDocuments || []).map(item => <option key={item.id} value={item.id}>Update “{item.title}” · {new Date(item.updatedAt).toLocaleDateString()}</option>)}
                </select>
                {ownedDocuments === null && <p className="mt-1 text-xs text-[#617574]">Checking existing shares…</p>}
                {ownedDocuments?.length === 0 && <p className="mt-1 text-xs text-[#617574]">No owned shares of this type yet.</p>}
                {ownedDocuments === null && error && <button type="button" onClick={() => { setError(""); void sharingRequest<{ documents: SharedDocument[] }>("/api/sharing/documents").then(r => setOwnedDocuments((r.documents || []).filter(d => d.role === "owner" && d.kind === source.kind))).catch(e => setError(e instanceof Error ? e.message : "Could not load your shares.")); }} className="mt-1 text-xs font-semibold text-[#2f7472] underline">Retry existing shares</button>}
              </div>
              <div><Label htmlFor="share-title">Document title</Label><Input id="share-title" maxLength={160} value={name} onChange={e => setName(e.target.value)} className="mt-1 bg-white" /></div>
              {targetDetail && <div className="rounded-xl border border-[#8eaaa0] bg-[#edf2eb] p-3 text-sm"><strong>Publish as a new revision</strong><p className="mt-1 text-xs text-[#617574]">Latest version by {targetDetail.versions?.find(v => v.revision === targetDetail.latestRevision)?.authorName || "a collaborator"} · {new Date(targetDetail.versions?.find(v => v.revision === targetDetail.latestRevision)?.createdAt || targetDetail.updatedAt).toLocaleString()}.</p><p className="mt-1 text-xs text-[#617574]">Publishing appends your current source as a new snapshot; it does not merge edits. Earlier versions and all access settings remain intact. If a collaborator saves after this revision loads, the server rejects your update rather than overwriting their newer version. Private-content inclusion ({targetDetail.includePrivate ? "included" : "excluded"}) is immutable.</p></div>}
              {targetId === "new" && <div className="rounded-2xl border border-[#dce4d9] p-4">
                <p className="mb-3 flex items-center gap-2 font-semibold"><LockKeyhole className="h-4 w-4 text-[#bf6d45]" /> Who can open it?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setOptions(v => ({ ...v, audience: "invited", allowRequests: false }))} className={`rounded-xl border p-3 text-left text-sm ${options.audience === "invited" ? "border-[#2f7472] bg-[#e8f1ec]" : "border-[#dce4d9]"}`}><Users className="mb-2 h-4 w-4" /><strong>Invited only</strong><span className="mt-1 block text-xs text-[#617574]">Private by default</span></button>
                  <button type="button" onClick={() => setOptions(v => ({ ...v, audience: "link" }))} className={`rounded-xl border p-3 text-left text-sm ${options.audience === "link" ? "border-[#2f7472] bg-[#e8f1ec]" : "border-[#dce4d9]"}`}><Globe2 className="mb-2 h-4 w-4" /><strong>Anyone with link</strong><span className="mt-1 block text-xs text-[#617574]">May be forwarded</span></button>
                </div>
                <label className="mt-3 flex items-start gap-3 text-sm"><input type="checkbox" checked={options.allowRequests} onChange={e => setOptions(v => ({ ...v, allowRequests: e.target.checked, audience: "invited" }))} className="mt-1 accent-[#2f7472]" /><span><strong>Let people request access</strong><span className="block text-xs text-[#617574]">You decide whether to approve each request.</span></span></label>
              </div>}
              {targetId === "new" && <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={options.allowDownload} onChange={e => setOptions(v => ({ ...v, allowDownload: e.target.checked }))} className="mt-1 accent-[#2f7472]" /><span><strong>Allow download and make a copy</strong><span className="block text-xs text-[#617574]">Viewers can export or fork this snapshot.</span></span></label>}
              {targetId === "new" ? <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={options.includePrivate} onChange={e => setOptions(v => ({ ...v, includePrivate: e.target.checked }))} className="mt-1 accent-[#2f7472]" /><span><strong>Include private notes and answer keys</strong><span className="block text-xs text-[#a45636]">Off by default. Server filtering only recognizes known structured fields; names and answers written in prose need your review. Only opt in after checking this snapshot.</span></span></label> : <p className="rounded-xl bg-[#f1eee4] p-3 text-xs text-[#617574]">Private notes and answer keys are {targetDetail?.includePrivate ? "included" : "excluded"} according to the original share. This setting is immutable for an existing document.</p>}
              {targetId === "new" && <div><Label htmlFor="share-expiry" className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Link expiry (optional)</Label><Input id="share-expiry" type="datetime-local" className="mt-1 bg-white" onChange={e => setOptions(v => ({ ...v, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null }))} /></div>}
            </>}
          </> : <>
            <div className="flex flex-col gap-4 rounded-2xl bg-[#edf2eb] p-4 sm:flex-row sm:items-center">
              {qr && <img src={qr} alt="QR code for the shared document" className="h-28 w-28 rounded-lg border bg-[#f8f6ef] p-1" />}
              <div className="min-w-0 flex-1"><p className="mb-2 text-sm font-semibold">Stable document link</p><Input readOnly value={stableShareUrl(document.id)} className="bg-white font-mono text-xs" /><div className="mt-3 flex gap-2"><Button type="button" size="sm" onClick={copy}>{copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}{copied ? "Copied" : "Copy link"}</Button><a href={qr} download="brightboard-share-qr.png" className="inline-flex items-center rounded-lg border border-[#cbd8cf] px-3 text-sm hover:bg-white"><QrCode className="mr-2 h-4 w-4" /> QR</a></div></div>
            </div>
            <div><Label htmlFor="share-email">Invite by email</Label><div className="mt-1 flex gap-2"><Input id="share-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@school.org" className="bg-white" /><Button type="button" variant="outline" onClick={invite} disabled={busy || !email.trim()}>Invite</Button></div></div>
            {(document.members?.length ?? 0) > 0 && <ul className="divide-y rounded-xl border border-[#dce4d9]">{document.members?.map(m => <li key={m.id} className="flex items-center justify-between p-3 text-sm"><span>{m.email}</span><span className="text-xs capitalize text-[#617574]">{m.role}</span></li>)}</ul>}
          <div className="border-t border-[#dce4d9] pt-4">
            <p className="mb-3 font-semibold">Link settings</p>
            <div className="mb-3 flex flex-wrap gap-4 text-sm"><label className="flex gap-2"><input type="radio" checked={options.audience === "invited"} onChange={() => setOptions(v => ({ ...v, audience: "invited" }))} />Invited only</label><label className="flex gap-2"><input type="radio" checked={options.audience === "link"} onChange={() => setOptions(v => ({ ...v, audience: "link" }))} />Anyone with link</label></div>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={options.allowRequests} onChange={e => setOptions(v => ({ ...v, allowRequests: e.target.checked, audience: "invited" }))} />Allow access requests</label>
            <label className="mt-2 flex gap-2 text-sm"><input type="checkbox" checked={options.allowDownload} onChange={e => setOptions(v => ({ ...v, allowDownload: e.target.checked }))} />Allow download and copies</label>
            <label className="mt-3 block text-sm">Expiry (optional)<Input type="datetime-local" className="mt-1 bg-white" value={options.expiresAt ? new Date(new Date(options.expiresAt).getTime() - new Date(options.expiresAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} onChange={e => setOptions(v => ({ ...v, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null }))} /></label>
            <p className="mt-3 rounded-xl bg-[#f1eee4] p-3 text-xs text-[#617574]">Private notes and answer keys are {document.includePrivate ? "included" : "excluded"} in this published snapshot. This choice cannot be changed after publishing; create a new share from the source to change it.</p>
              <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={update} disabled={busy}>Save settings</Button><Button type="button" variant="outline" onClick={async () => { setBusy(true); try { await sharingRequest(`/api/sharing/documents/${document.id}`, { method: "PATCH", body: JSON.stringify({ audience: options.audience, allowRequests: options.allowRequests, allowDownload: options.allowDownload, expiresAt: options.expiresAt, enabled: !document.enabled }) }); setDocument(await sharingRequest<SharedDetail>(`/api/sharing/documents/${document.id}`)); } catch (e) { setError(e instanceof Error ? e.message : "Could not change link status."); } finally { setBusy(false); } }}>{document.enabled ? "Disable link" : "Enable link"}</Button></div>
          </div>
          </>}
          {error && <p role="alert" className="rounded-xl border border-[#d89a80] bg-[#fff0e9] p-3 text-sm text-[#9c452e]">{error}</p>}
          {!document && isAuthenticated && <div className="flex justify-end gap-3 border-t border-[#dfe5dc] pt-4"><Button type="button" variant="ghost" onClick={close}>Cancel</Button><Button type="button" onClick={create} disabled={busy || !name.trim() || (ownedDocuments === null && !error) || (targetId !== "new" && !targetDetail)}>{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing snapshot…</> : ownedDocuments === null && !error ? "Checking existing shares…" : targetId === "new" ? "Create share" : "Publish as new revision"}</Button></div>}
          {document && <div className="flex justify-end border-t border-[#dfe5dc] pt-4"><Button type="button" onClick={close}>Done</Button></div>}
        </div>
      </section>
    </div>
  </>;
}

export function ShareDocumentButton({ kind, title, content, label }: { kind: string; title: string; content: any; label?: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
      <LinkIcon className="h-4 w-4" /> {label || "Share"}
    </Button>
    <ShareDialogInternal open={open} onOpenChange={setOpen} source={{ kind, title, content }} />
  </>;
}

export function ShareDocumentDialog({ open, onOpenChange, document, onPublished }: { open: boolean; onOpenChange: (b: boolean) => void; document: ShareSource; onPublished?: () => void }) {
  return <ShareDialogInternal open={open} onOpenChange={onOpenChange} source={document} onPublished={onPublished} />;
}

export function ShareButton({ kind, title, content, className = "gap-2" }: { kind: ShareKind; title: string; content: any; className?: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button type="button" variant="outline" size="sm" className={className} onClick={() => setOpen(true)}>
      <LinkIcon className="h-4 w-4" /> Share
    </Button>
    <ShareDialogInternal open={open} onOpenChange={setOpen} source={{ kind, title, content }} />
  </>;
}
