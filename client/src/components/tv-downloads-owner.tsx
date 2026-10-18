import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DownloadReport {
  totals: { requests: number; served: number; failed: number; incomplete: number; today: number; source: number; prebuilt: number };
  downloads: { id: string; kind: string; file_name: string; size_bytes: string; status: string; created_at: string }[];
  page: number;
  pageSize: number;
  github: { available: boolean; total: number | null; checkedAt: string; assets: { name: string; release: string; downloads: number }[]; error?: string };
}

export function TVDownloadsOwner() {
  const [page, setPage] = useState(1);
  const report = useQuery<DownloadReport>({
    queryKey: [`/api/owner/tv-downloads?page=${page}`],
    refetchInterval: 30_000,
  });
  const data = report.data;
  return <Card data-testid="tv-downloads-owner">
    <CardHeader className="flex flex-row flex-wrap justify-between gap-3">
      <div><CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" />BrightboardTV software downloads</CardTitle>
        <CardDescription className="mt-2">Founder-only records for the software ZIP downloads on BrightBoard.</CardDescription></div>
      <Button variant="outline" onClick={() => report.refetch()} disabled={report.isFetching}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
    </CardHeader>
    <CardContent className="space-y-5">
      <p className="text-sm text-muted-foreground">Website tracking begins when this update goes live. GitHub release-file totals are shown separately below. GitHub source archives, repository clones and PWA installations are not reported by these counters. A file served does not confirm it was saved or installed. These records do not store visitor IP addresses or personal details.</p>
      {report.isLoading && <p role="status">Loading download records…</p>}
      {report.isError && <p role="alert" className="text-destructive">Download records could not be loaded. Use Refresh to retry.</p>}
      {data && <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[["Total downloads served", data.totals.served], ["Today (UTC)", data.totals.today], ["Source ZIP", data.totals.source], ["Prebuilt ZIP", data.totals.prebuilt]].map(([label, value]) =>
            <div key={label} className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold mt-1">{Number(value).toLocaleString()}</p></div>)}
        </div>
        <p className="text-sm text-muted-foreground">{data.totals.requests} requests · {data.totals.failed} failed · {data.totals.incomplete} in progress or incomplete</p>
        <div className="rounded-lg border p-4 space-y-2" data-testid="github-download-counter">
          <h3 className="font-semibold">GitHub release downloads</h3>
          <p className="text-2xl font-bold">{data.github.available ? data.github.total?.toLocaleString() : "Unavailable"}</p>
          <p className="text-sm text-muted-foreground">From kayondoabass-svg/Brightboard-TV release assets. Cached for up to 15 minutes; checked {new Date(data.github.checkedAt).toLocaleString()}. GitHub does not identify individual downloaders.</p>
          {!data.github.available && <p role="status" className="text-sm text-destructive">{data.github.error} Website totals remain available.</p>}
          {data.github.available && data.github.assets.length === 0 && <p className="text-sm text-muted-foreground">No GitHub release files have been published yet. Upload ZIPs as release assets on GitHub to track their downloads.</p>}
          {data.github.assets.length > 0 && <ul className="text-sm space-y-1">{data.github.assets.map((asset, i) =>
            <li key={`${asset.release}-${asset.name}-${i}`}>{asset.release} · {asset.name}: <strong>{asset.downloads.toLocaleString()}</strong></li>)}</ul>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <caption className="sr-only">BrightboardTV software download history</caption>
            <thead><tr className="border-b"><th className="p-3">Date</th><th className="p-3">File</th><th className="p-3">Size</th><th className="p-3">Result</th></tr></thead>
            <tbody>{data.downloads.map(event => <tr key={event.id} className="border-b">
              <td className="p-3 whitespace-nowrap">{new Date(event.created_at).toLocaleString()}</td>
              <td className="p-3">{event.file_name}</td>
              <td className="p-3 whitespace-nowrap">{(Number(event.size_bytes) / 1024 / 1024).toFixed(1)} MB</td>
              <td className="p-3">{event.status === "served" ? "File served" : event.status === "failed" ? "Failed" : "In progress / incomplete"}</td>
            </tr>)}</tbody>
          </table>
          {!data.downloads.length && <p className="py-6 text-center text-muted-foreground">No software download records on this page yet.</p>}
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" disabled={page === 1 || report.isFetching} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm">Page {page} of {Math.max(1, Math.ceil(data.totals.requests / data.pageSize))}</span>
          <Button variant="outline" disabled={page * data.pageSize >= data.totals.requests || report.isFetching} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </>}
    </CardContent>
  </Card>;
}
