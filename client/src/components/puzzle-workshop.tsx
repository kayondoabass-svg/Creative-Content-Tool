import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WordSearchPreview } from "./word-search-preview";
import { ShareDocumentButton } from "./document-sharing";
import { buildWordSearch } from "@shared/worksheet-quality";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function PuzzleWorkshop({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [title, setTitle] = useState("Travel word search");
  const [words, setWords] = useState("BUS, TRAIN, TAXI, BICYCLE, AIRPORT, RIVER");
  const [puzzle, setPuzzle] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pdfFile, setPdfFile] = useState<{ file: string; name: string } | null>(null);
  const create = () => {
    try {
      if (!title.trim()) throw new Error("Enter a puzzle title.");
      setPuzzle({ title: title.trim(), layout: "wordSearch", colorMode: "colored", instructions: "Find the words from left to right.", ...buildWordSearch(words.split(/[,\n]+/).map(w => w.trim()).filter(Boolean)) });
      setError("");
      setPdfFile(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not build this puzzle."); }
  };
  const pdf = async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/worksheets/export", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: JSON.stringify(puzzle), format: "pdf" }), signal: AbortSignal.timeout(45_000) });
      const result = await response.json();
      if (!response.ok || typeof result.file !== "string" || !result.file.startsWith("data:application/pdf;base64,")) throw new Error(result.error || "PDF export could not complete.");
      setPdfFile({ file: result.file, name: result.fileName || "word-search.pdf" });
      const link = document.createElement("a"); link.href = result.file; link.download = result.fileName || "word-search.pdf"; link.click();
    } catch (e) { setError(e instanceof Error ? e.message : "PDF export failed."); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>Puzzles · Word Search</DialogTitle><DialogDescription>Create, play, download and share a checked word search.</DialogDescription></DialogHeader>
    <p className="text-sm text-muted-foreground">Build a solvable puzzle, play it here, or share the same grid with your learners. No AI generation is needed for placement.</p>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-3">
      <Label htmlFor="puzzle-title">Puzzle title</Label><Input id="puzzle-title" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} />
      <Label htmlFor="puzzle-words">Words separated by commas or new lines</Label><Textarea id="puzzle-words" value={words} maxLength={1000} onChange={e => setWords(e.target.value)} />
      <p className="text-xs text-muted-foreground">3–20 words, 2–20 letters each. This word-search format uses A–Z; accents are simplified and spaces are removed. Other scripts are not supported yet.</p>
      <Button onClick={create}>Build puzzle</Button>
      {puzzle && <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={pdf} disabled={busy}>{busy ? "Preparing PDF…" : "Download PDF"}</Button>
        <ShareDocumentButton kind="worksheet" title={puzzle.title} content={{ type: "worksheet", body: JSON.stringify(puzzle) }} label="Share puzzle" />
      </div>}
      {pdfFile && <p role="status" className="text-sm">PDF ready. <a className="font-semibold underline" href={pdfFile.file} download={pdfFile.name}>Save PDF</a> if your download did not start.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">Sign in to publish a share. Choose “Anyone with link” for viewing and play without sign-in. Editing still requires an approved account.</p>
    </div><div className="min-w-0">{puzzle ? <WordSearchPreview key={JSON.stringify(puzzle.grid)} puzzle={puzzle} /> : <p className="rounded-xl border p-5 text-sm text-muted-foreground">Your checked puzzle will appear here.</p>}</div></div>
  </DialogContent></Dialog>;
}
