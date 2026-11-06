import { useEffect, useState, type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { rememberAuthReturn } from "@/lib/editor-entry";
import { ShareDocumentDialog } from "@/components/document-sharing";

export function SharedAuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const destination = window.location.pathname + window.location.search;
      rememberAuthReturn(destination);
      setLocation(`/login?redirect=${encodeURIComponent(destination)}`, { replace: true });
    }
  }, [isAuthenticated, isLoading, setLocation]);
  if (isLoading || !isAuthenticated) return <p className="p-8 text-center" role="status">Opening BrightBoard sign-in…</p>;
  if (!user?.emailVerified) return <section className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">Confirm your email first</h1><p className="my-4">Shared documents are available to verified BrightBoard accounts.</p><Link href="/verify-email" className="text-primary underline">Verify email</Link></section>;
  return <>{children}</>;
}
export function SharingBridge() {
  const [source, setSource] = useState<{ kind: string; title: string; content: any } | null>(null);
  useEffect(() => {
    const share = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail && typeof detail.kind === "string" && typeof detail.title === "string" && detail.content) setSource(detail);
    };
    window.addEventListener("brightboard-share", share);
    return () => window.removeEventListener("brightboard-share", share);
  }, []);
  return source ? <ShareDocumentDialog key={`${source.kind}:${source.title}`} open onOpenChange={open => { if (!open) setSource(null); }} document={source} /> : null;
}
