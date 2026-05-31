import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Download, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const SETS = [
  { id: "animals",    emoji: "🦁", label: "Animals",          bg: "from-orange-400 to-amber-500",   words: ["cat","dog","bird","fish","elephant","lion","giraffe","monkey","rabbit","horse"] },
  { id: "numbers",   emoji: "🔢", label: "Numbers 1–10",     bg: "from-blue-400 to-blue-600",       words: ["one","two","three","four","five","six","seven","eight","nine","ten"] },
  { id: "colors",    emoji: "🎨", label: "Colors",            bg: "from-pink-400 to-purple-500",    words: ["red","blue","green","yellow","orange","purple","pink","white"] },
  { id: "shapes",    emoji: "🔷", label: "Shapes",            bg: "from-teal-400 to-cyan-500",      words: ["circle","square","triangle","rectangle","star","heart","diamond","oval"] },
  { id: "fruits",    emoji: "🍎", label: "Fruits",            bg: "from-red-400 to-rose-500",       words: ["apple","banana","orange","strawberry","mango","grapes","watermelon","pineapple"] },
  { id: "vegetables",emoji: "🥦", label: "Vegetables",        bg: "from-green-400 to-emerald-500",  words: ["carrot","broccoli","tomato","potato","onion","corn","pea","mushroom"] },
  { id: "weather",   emoji: "☀️", label: "Weather",           bg: "from-yellow-400 to-amber-500",   words: ["sunny","cloudy","rainy","snowy","windy","stormy","foggy","rainbow"] },
  { id: "body",      emoji: "🤸", label: "Body Parts",        bg: "from-violet-400 to-purple-500",  words: ["head","eyes","nose","mouth","ears","hands","feet","arms"] },
  { id: "classroom", emoji: "📚", label: "Classroom",         bg: "from-indigo-400 to-blue-500",    words: ["pencil","book","ruler","eraser","scissors","bag","desk","chair"] },
  { id: "transport", emoji: "🚗", label: "Transport",         bg: "from-sky-400 to-blue-500",       words: ["car","bus","airplane","boat","bicycle","train","truck","helicopter"] },
  { id: "clothes",   emoji: "👕", label: "Clothes",           bg: "from-fuchsia-400 to-pink-500",   words: ["shirt","pants","dress","shoes","hat","jacket","socks","gloves"] },
  { id: "actions",   emoji: "🏃", label: "Action Words",      bg: "from-orange-400 to-red-500",     words: ["run","jump","eat","sleep","read","write","sing","dance"] },
  { id: "days",      emoji: "📅", label: "Days of the Week",  bg: "from-purple-400 to-violet-500",  words: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"] },
  { id: "food",      emoji: "🍕", label: "Food & Drinks",     bg: "from-yellow-400 to-orange-500",  words: ["bread","milk","egg","juice","rice","soup","cheese","pizza"] },
];

const CARD_BG = [
  "from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40",
  "from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40",
  "from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40",
  "from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40",
  "from-pink-100 to-pink-200 dark:from-pink-900/40 dark:to-pink-800/40",
  "from-teal-100 to-teal-200 dark:from-teal-900/40 dark:to-teal-800/40",
  "from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40",
  "from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40",
];

type Layout = 1 | 2 | 4;
type Orientation = "portrait" | "landscape";

export default function FlashcardsPage() {
  const { toast } = useToast();
  const [activeSet, setActiveSet] = useState<typeof SETS[0] | null>(null);
  const [layout, setLayout] = useState<Layout>(4);
  const [orientation, setOrientation] = useState<Orientation>("landscape");

  const pdfMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/flashcards/pdf", {
        words: activeSet?.words,
        setId: activeSet?.id,
        setName: activeSet?.label,
        layout,
        orientation,
      });
      return res.json();
    },
    onSuccess: (data) => {
      const a = document.createElement("a");
      a.href = data.file;
      a.download = data.fileName;
      a.click();
      toast({ title: "PDF downloaded!", description: "Print and cut your flashcards." });
    },
    onError: () => toast({ title: "PDF generation failed", variant: "destructive" }),
  });

  /* ─── Set detail view ─── */
  if (activeSet) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <div className={`bg-gradient-to-r ${activeSet.bg} text-white py-8`}>
          <div className="container mx-auto px-4">
            <button
              onClick={() => setActiveSet(null)}
              className="flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4 transition-colors"
              data-testid="button-flashcard-back"
            >
              <ArrowLeft className="w-4 h-4" /> All Flashcard Sets
            </button>
            <div className="flex items-start gap-4 flex-wrap">
              <span className="text-5xl">{activeSet.emoji}</span>
              <div className="flex-1">
                <h1 className="text-3xl font-black">{activeSet.label}</h1>
                <p className="text-white/80 text-sm">{activeSet.words.length} cards · Free to download</p>
              </div>
            </div>
          </div>
        </div>

        {/* PDF options + download */}
        <div className="bg-white dark:bg-gray-900 border-b shadow-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3 flex flex-wrap items-center gap-4">
            {/* Cards per page */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Cards per page:</span>
              <div className="flex rounded-lg border overflow-hidden">
                {([1, 2, 4] as Layout[]).map(n => (
                  <button
                    key={n}
                    onClick={() => setLayout(n)}
                    className={`px-3 py-1.5 text-sm font-semibold transition-colors ${layout === n ? "bg-purple-600 text-white" : "bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/30"}`}
                    data-testid={`button-layout-${n}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Page:</span>
              <div className="flex rounded-lg border overflow-hidden">
                {(["portrait", "landscape"] as Orientation[]).map(o => (
                  <button
                    key={o}
                    onClick={() => setOrientation(o)}
                    className={`px-3 py-1.5 text-sm font-semibold transition-colors capitalize ${orientation === o ? "bg-purple-600 text-white" : "bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/30"}`}
                    data-testid={`button-orientation-${o}`}
                  >
                    {o === "portrait" ? "↕ Portrait" : "↔ Landscape"}
                  </button>
                ))}
              </div>
            </div>

            <div className="ml-auto">
              <Button
                onClick={() => pdfMutation.mutate()}
                disabled={pdfMutation.isPending}
                className="gap-2 bg-purple-600 hover:bg-purple-700"
                data-testid="button-flashcard-download"
              >
                {pdfMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {pdfMutation.isPending ? "Making PDF…" : "Download PDF"}
              </Button>
            </div>
          </div>
        </div>

        {/* Cards grid */}
        <div className="flex-1 container mx-auto px-4 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {activeSet.words.map((word, i) => (
              <div
                key={word}
                className={`rounded-2xl overflow-hidden shadow-md border border-white/60 bg-gradient-to-br ${CARD_BG[i % CARD_BG.length]} flex flex-col`}
                style={{ aspectRatio: "3/4" }}
                data-testid={`card-flashcard-${i}`}
              >
                <div className="flex-1 flex items-center justify-center p-3">
                  <img
                    src={`/flashcard-images/${activeSet.id}/${word.toLowerCase()}.png`}
                    alt={word}
                    className="max-h-full max-w-full object-contain rounded-xl"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                      const parent = e.currentTarget.parentElement;
                      if (parent && !parent.querySelector(".emoji-fallback")) {
                        const span = document.createElement("span");
                        span.className = "emoji-fallback text-5xl";
                        span.textContent = activeSet.emoji;
                        parent.appendChild(span);
                      }
                    }}
                  />
                </div>
                <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm py-3 px-2 text-center">
                  <p className="font-bold text-lg capitalize text-gray-800 dark:text-gray-100">{word}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Choose <strong>{layout} cards per page</strong> in <strong>{orientation}</strong> format, then click Download PDF.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  /* ─── Category grid ─── */
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-teal-600 text-white py-20">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }}
        />
        <div className="relative container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            📚 100% Free · No account needed
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Free Printable Flashcards
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
            Beautiful AI-illustrated flashcards for every classroom. Download as print-ready PDFs — completely free, no login required.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {["14 Topic Sets", "AI Illustrations", "1 / 2 / 4 Cards per Page", "Portrait & Landscape"].map(f => (
              <span key={f} className="bg-white/15 rounded-full px-4 py-1.5 text-sm">✓ {f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold mb-2">Choose a Topic</h2>
          <p className="text-muted-foreground">Click any set to preview all cards and download a printable PDF</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
          {SETS.map(set => (
            <button
              key={set.id}
              onClick={() => setActiveSet(set)}
              className="group rounded-2xl overflow-hidden border-2 border-transparent hover:border-purple-400 hover:shadow-xl hover:-translate-y-1 transition-all text-left cursor-pointer"
              data-testid={`button-flashcard-set-${set.id}`}
            >
              <div className={`bg-gradient-to-br ${set.bg} h-28 flex items-center justify-center`}>
                <span className="text-5xl group-hover:scale-110 transition-transform">{set.emoji}</span>
              </div>
              <div className="p-3 bg-card">
                <p className="font-bold text-sm leading-tight">{set.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{set.words.length} cards</p>
              </div>
            </button>
          ))}
        </div>

        {/* Info cards */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {[
            { emoji: "🆓", title: "Completely Free", desc: "All 14 flashcard sets are free forever. No account, no payment, no catch — use them in any classroom." },
            { emoji: "🖼️", title: "AI Illustrations", desc: "Every card has a unique cartoon illustration generated by BrightBoard's AI — perfect for visual learners and ESL classes." },
            { emoji: "🖨️", title: "Flexible PDF Layouts", desc: "Choose 1, 2, or 4 cards per page in portrait or landscape format. Print, cut, and laminate for years of use." },
          ].map(f => (
            <div key={f.title} className="text-center p-6 rounded-2xl bg-muted/50 border">
              <div className="text-4xl mb-3">{f.emoji}</div>
              <h3 className="font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center p-8 bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-950/30 dark:to-teal-950/30 rounded-2xl border">
          <p className="font-bold text-lg mb-2">Want to make your own custom flashcards?</p>
          <p className="text-muted-foreground text-sm mb-4">Use BrightBoard's AI to generate presentations, worksheets, mind maps and more — fully customised for your class.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button asChild className="bg-purple-600 hover:bg-purple-700">
              <Link href="/signup">Try BrightBoard Free</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pricing">See Pricing</Link>
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
