import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, Clock3, FileText, LockKeyhole, RefreshCw, Share2, Users } from "lucide-react";
import { Footer } from "@/components/footer";
import { ShareDocumentDialog } from "@/components/document-sharing";
import { useAuth } from "@/hooks/use-auth";
import { sharingRequest, type SharedDocument } from "@/lib/sharing";

const kindLabel: Record<string, string> = { editor: "Editor project", tv: "TV lesson", image: "Image", text: "Text", presentation: "Presentation", worksheet: "Worksheet", activity: "Activity", storyboard: "Storyboard", mindmap: "Mind map", studio: "Studio document", file: "File" };
export default function SharedDocumentsPage() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [documents, setDocuments] = useState<SharedDocument[] | null>(null);
  const [capture, setCapture] = useState<{ id: string; document: { kind: string; title: string; content: any }; published?: boolean } | null>(null);
  const [captureOpen, setCaptureOpen] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const result = await sharingRequest<{ documents: SharedDocument[] }>("/api/sharing/documents"); setDocuments(result.documents || []); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load shared documents."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (isAuthenticated) void load(); }, [isAuthenticated, load]);
  useEffect(() => {
    const captureId = new URLSearchParams(window.location.search).get("capture");
    if (!captureId || !/^[0-9a-f-]{36}$/i.test(captureId)) return;
    try {
      const raw = localStorage.getItem(`brightboard-share-capture:${captureId}`);
      if (!raw) { setError("The document prepared for sharing was not found on this device."); return; }
      const payload = JSON.parse(raw);
      if (!payload || typeof payload.kind !== "string" || typeof payload.title !== "string" || !("content" in payload)) throw new Error();
      setCapture({ id: captureId, document: payload });
    } catch { setError("This prepared share could not be read. Return to your document and try again."); }
  }, []);
  const completeCapture = () => {
    if (!capture) return;
    localStorage.removeItem(`brightboard-share-capture:${capture.id}`);
    setCapture(value => value ? { ...value, published: true } : value);
    setLocation("/shared", { replace: true }); void load();
  };
  return <><main className="min-h-[70dvh] bg-[#f4f3ec] px-4 py-10 text-[#183c40] md:px-8">
    <div className="mx-auto max-w-6xl">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#bf6d45]">Your shared work</p><h1 className="bb-display mt-2 text-4xl font-bold tracking-tight md:text-5xl">Documents, in good hands.</h1><p className="mt-3 max-w-xl text-[#617574]">Manage access, review requests, and revisit any published version.</p></div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[#cbd8cf] bg-[#fbfaf5] px-4 py-2.5 text-sm font-semibold hover:bg-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
      </div>
      {!isAuthenticated && <section className="rounded-3xl border border-[#d8dfd4] bg-[#fbfaf5] p-8"><LockKeyhole className="mb-4 h-8 w-8 text-[#bf6d45]" /><h2 className="bb-display text-2xl font-bold">Sign in to manage your shares</h2><p className="mt-2 text-[#617574]">Shared links can still be opened directly. Your private sharing dashboard requires an account.</p><Link href={`/login?redirect=${encodeURIComponent("/shared")}`} className="mt-5 inline-flex rounded-xl bg-[#2f7472] px-5 py-3 font-semibold text-white hover:bg-[#245c5b]">Sign in</Link></section>}
      {isAuthenticated && <>{error && <div role="alert" className="mb-5 rounded-2xl border border-[#d89a80] bg-[#fff0e9] p-4 text-[#9c452e]">{error}<button onClick={() => void load()} className="ml-3 underline">Retry</button></div>}
        {!documents && !error && <div className="grid gap-4">{[1,2,3].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-[#e6e9df]" />)}</div>}
        {documents?.length === 0 && <section className="rounded-3xl border border-dashed border-[#bdcbc0] bg-[#fbfaf5] px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e8f1ec]"><Share2 className="h-6 w-6 text-[#2f7472]" /></div><h2 className="bb-display mt-5 text-2xl font-bold">Nothing shared yet</h2><p className="mx-auto mt-2 max-w-lg text-[#617574]">When you publish a lesson, image or project from BrightBoard, it will be managed here.</p><Link href="/" className="mt-6 inline-flex rounded-xl bg-[#2f7472] px-5 py-3 font-semibold text-white hover:bg-[#245c5b]">Make something to share</Link></section>}
        {capture && !capture.published && !captureOpen && <button type="button" onClick={() => setCaptureOpen(true)} className="mb-5 rounded-xl border border-[#88aaa0] bg-[#e8f1ec] px-4 py-3 text-sm font-semibold text-[#2f7472]">Resume sharing “{capture.document.title}”</button>}
        {documents && documents.length > 0 && <div className="space-y-3">{documents.map((doc, index) => <Link key={doc.id} href={`/share/${doc.id}`} className="group flex flex-col justify-between gap-4 rounded-2xl border border-[#d8dfd4] bg-[#fbfaf5] p-5 transition hover:-translate-y-0.5 hover:border-[#88aaa0] hover:shadow-lg hover:shadow-[#183c40]/5 sm:flex-row sm:items-center" style={{ animationDelay: `${index * 45}ms` }}>
          <div className="flex min-w-0 items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#e8f1ec] text-[#2f7472]"><FileText className="h-5 w-5" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold">{doc.title}</h2><span className="rounded-full bg-[#f1e7dc] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#9c5c3e]">{kindLabel[doc.kind] || doc.kind}</span></div><p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#617574]"><span className="capitalize">{doc.role}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{new Date(doc.updatedAt).toLocaleDateString()}</span>{doc.pendingRequests > 0 && <span className="inline-flex items-center gap-1 font-semibold text-[#ad5839]"><Users className="h-3 w-3" />{doc.pendingRequests} pending access request{doc.pendingRequests === 1 ? "" : "s"}</span>}</p></div></div>
          <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#2f7472]">Manage <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
        </Link>)}</div>}
      </>}
    </div>
  </main><Footer />{capture && <ShareDocumentDialog open={captureOpen} onOpenChange={open => { setCaptureOpen(open); if (!open && capture.published) setCapture(null); }} document={capture.document} onPublished={completeCapture} />}</>;
}
