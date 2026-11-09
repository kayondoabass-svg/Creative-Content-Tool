import { useMemo, useState } from "react";
import { validateWordSearchPuzzle } from "@shared/puzzle-validation";

export function WordSearchPreview({ puzzle }: { puzzle: any }) {
  const [start, setStart] = useState<[number, number] | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const valid = useMemo(() => {
    try { validateWordSearchPuzzle(puzzle, false); return true; } catch { return false; }
  }, [puzzle]);
  if (!valid) return <p role="alert">This saved puzzle could not be validated. Ask the owner to publish a checked word search.</p>;
  const choose = (r: number, c: number) => {
    if (!start) { setStart([r, c]); setNotice("Now select the last letter."); return; }
    const [sr, sc] = start, dr = r - sr, dc = c - sc;
    setStart(null);
    if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) { setNotice("Choose a straight line."); return; }
    const length = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
    const text = Array.from({ length }, (_, i) => puzzle.grid[sr + Math.sign(dr) * i][sc + Math.sign(dc) * i]).join("");
    const word = puzzle.words.find((w: string) => w === text || w === Array.from(text).reverse().join(""));
    if (!word) { setNotice("Not a target word. Try again."); return; }
    setFound(previous => previous.includes(word) ? previous : [...previous, word]);
    setNotice(`Found ${word}.`);
  };
  return <section aria-label="Shared word search" className="space-y-4">
    <h2 className="text-2xl font-bold">{puzzle.title || "Word search"}</h2>
    <p>{puzzle.instructions || "Find the words."} Select the first and last letter to mark a word. Your play does not edit the shared document.</p>
    <div className="overflow-x-auto"><div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${puzzle.grid[0].length}, 2rem)` }}>
      {puzzle.grid.flatMap((row: string[], r: number) => row.map((letter, c) =>
        <button key={`${r}:${c}`} type="button" aria-label={`Row ${r + 1}, column ${c + 1}: ${letter}`} aria-pressed={start?.[0] === r && start?.[1] === c}
          onClick={() => choose(r, c)} className={`h-8 w-8 rounded border font-mono font-bold ${start?.[0] === r && start?.[1] === c ? "bg-teal-700 text-white" : "bg-white text-slate-800"}`}>{letter}</button>))}
    </div></div>
    <ul className="flex flex-wrap gap-3" aria-label="Words to find">{puzzle.words.map((word: string) => <li key={word} className={found.includes(word) ? "line-through text-teal-700" : ""}>{word}</li>)}</ul>
    <p role="status">{found.length === puzzle.words.length ? "All words found!" : notice || `${found.length} of ${puzzle.words.length} found`}</p>
    <button type="button" className="underline text-sm" onClick={() => { setStart(null); setFound([]); setNotice(""); }}>Restart puzzle</button>
  </section>;
}
