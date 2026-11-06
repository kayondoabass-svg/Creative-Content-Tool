import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Inbox } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { sharingRequest, type SharedDocument } from "@/lib/sharing";

export function SharingInboxLink() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { data } = useQuery<{ documents: SharedDocument[] }>({
    queryKey: ["sharing", "documents", user?.id],
    queryFn: () => sharingRequest("/api/sharing/documents"),
    enabled: isAuthenticated && !isLoading,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
  if (!isAuthenticated || isLoading) return null;
  const pending = (data?.documents || []).reduce((sum, item) => sum + (Number(item.pendingRequests) || 0), 0);
  return <Link href="/shared" className="relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted" aria-label={pending ? `Shared documents, ${pending} pending access requests` : "Shared documents"}>
    <Inbox className="h-4 w-4 text-primary" />
    <span className="hidden sm:inline">Shared</span>
    {pending > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#bf6d45] px-1 text-[10px] font-bold leading-none text-white">{pending > 99 ? "99+" : pending}</span>}
  </Link>;
}
