import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Eye } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import type { Slide } from "@shared/schema";
import { BrightBoardLogo } from "./brightboard-logo";

interface SlideshowModalProps {
  slides: Slide[];
  title: string;
  isOpen: boolean;
  onClose: () => void;
  transition?: string;
  transitionDelay?: number;
  tapToReveal?: boolean;
  gameType?: string;
}

const TRANSITION_STYLES: Record<string, string> = {
  fade: "animate-fade-slide",
  slide: "animate-slide-in",
  zoom: "animate-zoom-in",
  flip: "animate-flip-in",
};

// ─── Game slide renderers ────────────────────────────────────────────────────

function JeopardyBoard({ gameData }: { gameData: any }) {
  const cats = (gameData?.categories || []).slice(0, 4);
  const POINT_ROWS = [100, 200, 300, 400, 500];
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[480px]">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cats.length}, 1fr)` }}>
          {cats.map((cat: any, ci: number) => (
            <div key={ci} className="bg-blue-800 text-yellow-300 font-extrabold text-center py-3 px-2 rounded-md text-sm md:text-base uppercase tracking-wide shadow-md">
              {cat.name}
            </div>
          ))}
          {POINT_ROWS.map(pts => (
            cats.map((cat: any, ci: number) => (
              <div key={`${pts}-${ci}`} className="bg-blue-700 hover:bg-blue-600 text-yellow-400 font-bold text-center py-4 rounded-md text-lg md:text-2xl shadow cursor-pointer transition-colors">
                {pts}
              </div>
            ))
          ))}
        </div>
      </div>
    </div>
  );
}

function JeopardyClue({ gameData, revealed, onReveal }: { gameData: any; revealed: boolean; onReveal: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[280px] gap-6">
      <div className="text-center">
        <span className="text-blue-300 font-semibold text-sm uppercase tracking-widest">{gameData?.category} — {gameData?.points} pts</span>
        <p className="text-white text-xl md:text-3xl font-bold mt-3 leading-snug">{gameData?.clue}</p>
      </div>
      {revealed ? (
        <div className="bg-yellow-400 text-blue-900 rounded-xl px-6 py-4 text-center shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1">Answer</p>
          <p className="text-lg md:text-2xl font-bold">{gameData?.answer}</p>
        </div>
      ) : (
        <Button onClick={onReveal} className="bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-bold px-8 py-3 text-base rounded-xl shadow-lg">
          <Eye className="w-4 h-4 mr-2" /> Reveal Answer
        </Button>
      )}
    </div>
  );
}

function QuizQuestion({ gameData, revealed, onReveal }: { gameData: any; revealed: boolean; onReveal: () => void }) {
  const opts = [
    { key: "a", label: "A", color: "bg-blue-500 hover:bg-blue-400", correct: "bg-green-500", wrong: "bg-gray-400" },
    { key: "b", label: "B", color: "bg-green-500 hover:bg-green-400", correct: "bg-green-500", wrong: "bg-gray-400" },
    { key: "c", label: "C", color: "bg-orange-500 hover:bg-orange-400", correct: "bg-green-500", wrong: "bg-gray-400" },
    { key: "d", label: "D", color: "bg-red-500 hover:bg-red-400", correct: "bg-green-500", wrong: "bg-gray-400" },
  ];
  const correct = (gameData?.correct || "a").toLowerCase();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg md:text-2xl font-bold text-foreground text-center leading-snug">{gameData?.question}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {opts.map(opt => {
          const isCorrect = opt.key === correct;
          const bgClass = !revealed
            ? opt.color
            : isCorrect ? "bg-green-500" : "bg-gray-400 opacity-60";
          return (
            <div key={opt.key} className={`${bgClass} text-white rounded-xl px-4 py-4 flex items-center gap-3 transition-all shadow-md`}>
              <span className="text-xl font-extrabold opacity-80 w-8 text-center shrink-0">{opt.label}</span>
              <span className="font-semibold text-sm md:text-base">{gameData?.options?.[opt.key]}</span>
              {revealed && isCorrect && <span className="ml-auto text-xl">✅</span>}
            </div>
          );
        })}
      </div>
      {revealed ? (
        <p className="text-center text-sm text-muted-foreground italic mt-1">{gameData?.explanation}</p>
      ) : (
        <div className="text-center mt-1">
          <Button onClick={onReveal} variant="outline" className="font-bold">
            <Eye className="w-4 h-4 mr-2" /> Reveal Answer
          </Button>
        </div>
      )}
    </div>
  );
}

function TrueFalse({ gameData, revealed, onReveal }: { gameData: any; revealed: boolean; onReveal: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="bg-muted/30 rounded-2xl px-6 py-6 text-center max-w-lg">
        <p className="text-xl md:text-3xl font-bold text-foreground leading-snug">{gameData?.statement}</p>
      </div>
      <div className="flex gap-4">
        <div className={`flex-1 rounded-2xl px-8 py-5 text-center font-extrabold text-xl shadow-lg transition-all ${
          !revealed ? "bg-green-500 text-white" :
          gameData?.answer ? "bg-green-500 text-white ring-4 ring-green-300 scale-105" : "bg-gray-300 text-gray-600 opacity-50"
        }`}>
          ✅ TRUE
        </div>
        <div className={`flex-1 rounded-2xl px-8 py-5 text-center font-extrabold text-xl shadow-lg transition-all ${
          !revealed ? "bg-red-500 text-white" :
          !gameData?.answer ? "bg-red-500 text-white ring-4 ring-red-300 scale-105" : "bg-gray-300 text-gray-600 opacity-50"
        }`}>
          ❌ FALSE
        </div>
      </div>
      {!revealed && (
        <Button onClick={onReveal} variant="outline" className="font-bold">
          <Eye className="w-4 h-4 mr-2" /> Reveal Answer
        </Button>
      )}
      {revealed && (
        <p className="text-center text-sm text-muted-foreground italic max-w-md">{gameData?.explanation}</p>
      )}
    </div>
  );
}

function MemoryPair({ gameData }: { gameData: any }) {
  return (
    <div className="grid md:grid-cols-2 gap-4 mt-2">
      <div className="bg-purple-600 text-white rounded-2xl p-6 flex flex-col items-center justify-center min-h-[180px] shadow-xl">
        <div className="text-4xl mb-3">{gameData?.emoji || "🃏"}</div>
        <p className="text-2xl md:text-3xl font-extrabold text-center">{gameData?.word}</p>
        <p className="text-xs uppercase tracking-widest mt-3 opacity-70">WORD CARD</p>
      </div>
      <div className="bg-teal-600 text-white rounded-2xl p-6 flex flex-col items-center justify-center min-h-[180px] shadow-xl">
        <p className="text-base md:text-lg font-semibold text-center leading-relaxed">{gameData?.definition}</p>
        <p className="text-xs uppercase tracking-widest mt-3 opacity-70">DEFINITION CARD</p>
      </div>
    </div>
  );
}

function MemoryOverview({ gameData }: { gameData: any }) {
  const pairs = gameData?.pairs || [];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
      {pairs.map((p: any, i: number) => (
        <div key={i} className="bg-purple-100 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl px-3 py-3 text-center">
          <div className="text-2xl mb-1">{p.emoji || "🃏"}</div>
          <p className="font-bold text-sm text-purple-800 dark:text-purple-200">{p.word}</p>
        </div>
      ))}
    </div>
  );
}

function FillBlank({ gameData, revealed, onReveal }: { gameData: any; revealed: boolean; onReveal: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-700 rounded-2xl px-8 py-6 text-center max-w-xl">
        <p className="text-xl md:text-2xl font-bold text-foreground leading-relaxed">{gameData?.sentence}</p>
      </div>
      {gameData?.hint && (
        <p className="text-sm text-muted-foreground italic">💡 Hint: {gameData.hint}</p>
      )}
      {!revealed ? (
        <Button onClick={onReveal} className="bg-amber-500 hover:bg-amber-400 text-white font-bold px-8 py-3 rounded-xl">
          <Eye className="w-4 h-4 mr-2" /> Reveal Answer
        </Button>
      ) : (
        <div className="bg-green-500 text-white rounded-2xl px-8 py-4 text-center shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1">Answer</p>
          <p className="text-2xl font-extrabold">{gameData?.answer}</p>
        </div>
      )}
    </div>
  );
}

function OddOneOut({ gameData, revealed, onReveal }: { gameData: any; revealed: boolean; onReveal: () => void }) {
  const items = gameData?.items || [];
  const oddIdx = gameData?.oddIndex ?? -1;
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
        {items.map((item: string, i: number) => {
          const isOdd = i === oddIdx;
          const bgClass = !revealed
            ? "bg-indigo-100 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-700 text-foreground"
            : isOdd
              ? "bg-red-500 text-white border-red-400 scale-105"
              : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-muted-foreground";
          return (
            <div key={i} className={`${bgClass} border-2 rounded-2xl p-4 text-center font-bold text-base md:text-lg transition-all shadow-md`}>
              <span className="opacity-60 text-sm block mb-1">{i + 1}</span>
              {item}
              {revealed && isOdd && <div className="text-sm mt-1">🚩 Odd one!</div>}
            </div>
          );
        })}
      </div>
      {!revealed ? (
        <Button onClick={onReveal} variant="outline" className="font-bold">
          <Eye className="w-4 h-4 mr-2" /> Reveal Odd One Out
        </Button>
      ) : (
        <p className="text-center text-sm text-muted-foreground italic max-w-md">{gameData?.reason}</p>
      )}
    </div>
  );
}

function PicturePair({ gameData }: { gameData: any }) {
  return (
    <div className="grid md:grid-cols-2 gap-6 items-center">
      <div className="flex flex-col items-center">
        <div className="text-4xl md:text-6xl font-extrabold text-primary mb-3">{gameData?.word}</div>
        {gameData?.fact && <p className="text-sm text-muted-foreground text-center italic">{gameData.fact}</p>}
      </div>
      {gameData?.image ? (
        <img src={gameData.image} alt={gameData.word} className="w-full max-w-xs mx-auto rounded-2xl shadow-xl" />
      ) : (
        <div className="w-full max-w-xs mx-auto aspect-square bg-muted rounded-2xl flex items-center justify-center text-6xl">🖼️</div>
      )}
    </div>
  );
}

function WheelCategory({ gameData }: { gameData: any }) {
  const words = gameData?.words || [];
  return (
    <div className="flex flex-col gap-4 mt-2">
      <div className="text-center">
        <span className="text-4xl">{gameData?.emoji || "🎡"}</span>
        <h3 className="text-xl font-bold text-foreground mt-1">{gameData?.name}</h3>
      </div>
      <div className="grid gap-3">
        {words.map((w: any, i: number) => (
          <div key={i} className="bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800 rounded-xl px-4 py-3 flex gap-3">
            <span className="font-extrabold text-purple-600 dark:text-purple-300 shrink-0">{w.word}</span>
            <span className="text-muted-foreground text-sm">{w.definition}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HiddenPictureSlide({ gameData, revealed, onReveal, isIntro, isFinal }: {
  gameData: any; revealed: boolean; onReveal: () => void; isIntro?: boolean; isFinal?: boolean;
}) {
  const totalTiles = 9;
  const tilesRevealed = Math.min(gameData?.tilesRevealed || 0, totalTiles);
  const imageB64 = gameData?.imageB64;

  if (isIntro) {
    return (
      <div className="flex flex-col items-center gap-6 py-4 text-center">
        <div className="text-6xl">🎯</div>
        <p className="text-xl md:text-2xl font-bold text-foreground">Can you reveal the hidden picture?</p>
        <p className="text-muted-foreground">Answer {gameData?.totalQuestions || 9} questions to uncover the image!</p>
        {imageB64 ? (
          <div className="relative w-full max-w-sm mx-auto aspect-square rounded-2xl overflow-hidden shadow-xl">
            <img src={imageB64} alt="Hidden" className="w-full h-full object-cover blur-xl opacity-30" />
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1 p-1">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="bg-purple-600 rounded-md opacity-95" />
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm aspect-square bg-purple-100 dark:bg-purple-950/30 rounded-2xl flex items-center justify-center">
            <span className="text-6xl">🖼️</span>
          </div>
        )}
      </div>
    );
  }

  if (isFinal) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="text-5xl">🎉</div>
        <p className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">{gameData?.revealText || "You revealed the picture!"}</p>
        {imageB64 && (
          <img src={imageB64} alt="Revealed" className="w-full max-w-sm mx-auto rounded-2xl shadow-xl" />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 items-center">
      {imageB64 && (
        <div className="relative w-full max-w-sm mx-auto aspect-square rounded-2xl overflow-hidden shadow-xl">
          <img src={imageB64} alt="Hidden" className="w-full h-full object-cover" />
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1 p-1">
            {Array.from({ length: totalTiles }).map((_, i) => (
              i < totalTiles - tilesRevealed ? (
                <div key={i} className="rounded-md" style={{ background: `hsl(${(i * 40) % 360}, 70%, 45%)` }} />
              ) : (
                <div key={i} className="rounded-md bg-transparent" />
              )
            ))}
          </div>
        </div>
      )}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 rounded-2xl px-6 py-4 text-center w-full max-w-lg">
        <p className="font-bold text-base md:text-xl text-foreground">❓ {gameData?.question}</p>
      </div>
      {!revealed ? (
        <Button onClick={onReveal} variant="outline" className="font-bold">
          <Eye className="w-4 h-4 mr-2" /> Reveal Answer
        </Button>
      ) : (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-700 rounded-xl px-5 py-3 text-center">
          <p className="text-green-700 dark:text-green-300 font-semibold">✅ {gameData?.answer}</p>
          <p className="text-xs text-muted-foreground mt-1">{tilesRevealed} of {totalTiles} tiles revealed</p>
        </div>
      )}
    </div>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────────────

export function SlideshowModal({ slides, title, isOpen, onClose, transition, transitionDelay, tapToReveal, gameType }: SlideshowModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [revealedCount, setRevealedCount] = useState(tapToReveal ? 0 : Infinity);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slide = slides[currentSlide];
  const slideType = (slide as any)?.slideType as string | undefined;
  const gd = (slide as any)?.gameData;
  const isGameSlide = !!slideType;

  const bulletCount = slide?.content?.length ?? 0;
  const allRevealed = revealedCount >= bulletCount;

  const advanceSlide = useCallback(() => {
    setCurrentSlide(prev => {
      if (prev < slides.length - 1) {
        setAnimKey(k => k + 1);
        setRevealedCount(tapToReveal ? 0 : Infinity);
        setAnswerRevealed(false);
        return prev + 1;
      }
      return prev;
    });
  }, [slides.length, tapToReveal]);

  const goNext = useCallback(() => {
    if (tapToReveal && !allRevealed && !isGameSlide) {
      setRevealedCount(prev => prev + 1);
    } else {
      advanceSlide();
    }
  }, [tapToReveal, allRevealed, advanceSlide, isGameSlide]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
      setAnimKey(k => k + 1);
      setRevealedCount(tapToReveal ? 0 : Infinity);
      setAnswerRevealed(false);
    }
  }, [currentSlide, tapToReveal]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      else if (e.key === "Escape") { onClose(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, goNext, goPrev, onClose]);

  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
      setAnimKey(0);
      setRevealedCount(tapToReveal ? 0 : Infinity);
      setAnswerRevealed(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, tapToReveal]);

  useEffect(() => {
    if (!transitionDelay || transitionDelay <= 0 || !isOpen) return;
    if (tapToReveal && !allRevealed) return;
    if (currentSlide >= slides.length - 1) return;
    delayRef.current = setTimeout(() => advanceSlide(), transitionDelay * 1000);
    return () => { if (delayRef.current) clearTimeout(delayRef.current); };
  }, [currentSlide, revealedCount, transitionDelay, isOpen, tapToReveal, allRevealed, advanceSlide, slides.length]);

  if (!isOpen || slides.length === 0) return null;

  const animClass = transition && transition !== "none" ? (TRANSITION_STYLES[transition] || "") : "";
  const visibleContent = tapToReveal
    ? (slide?.content || []).slice(0, Math.floor(revealedCount))
    : (slide?.content || []);

  const revealHint = tapToReveal && !allRevealed && !isGameSlide;
  const nextSlideHint = tapToReveal && allRevealed && currentSlide < slides.length - 1 && !isGameSlide;

  // Game slide background colours
  const gameSlideClass =
    slideType === "jeopardyBoard" || slideType === "jeopardyClue" ? "bg-blue-900 text-white" :
    slideType === "quizQuestion" ? "bg-white dark:bg-card" :
    slideType === "trueFalse" ? "bg-slate-800 text-white" :
    slideType === "hiddenPictureReveal" ? "bg-gradient-to-b from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-950" :
    "bg-white dark:bg-card";

  const renderGameSlide = () => {
    if (!isGameSlide) return null;
    switch (slideType) {
      case "jeopardyBoard":
        return <JeopardyBoard gameData={gd} />;
      case "jeopardyClue":
        return <JeopardyClue gameData={gd} revealed={answerRevealed} onReveal={() => setAnswerRevealed(true)} />;
      case "quizQuestion":
        return <QuizQuestion gameData={gd} revealed={answerRevealed} onReveal={() => setAnswerRevealed(true)} />;
      case "trueFalse":
        return <TrueFalse gameData={gd} revealed={answerRevealed} onReveal={() => setAnswerRevealed(true)} />;
      case "memoryOverview":
        return <MemoryOverview gameData={gd} />;
      case "memoryPair":
        return <MemoryPair gameData={gd} />;
      case "fillBlank":
        return <FillBlank gameData={gd} revealed={answerRevealed} onReveal={() => setAnswerRevealed(true)} />;
      case "oddOneOut":
        return <OddOneOut gameData={gd} revealed={answerRevealed} onReveal={() => setAnswerRevealed(true)} />;
      case "picMatchOverview":
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
            {(gd?.pairs || []).map((p: any, i: number) => (
              <div key={i} className="bg-muted rounded-xl p-3 text-center font-bold text-sm">{p.word}</div>
            ))}
          </div>
        );
      case "picturePair":
        return <PicturePair gameData={gd} />;
      case "wheelOverview":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
            {(gd?.categories || []).map((c: any, i: number) => (
              <div key={i} className="bg-purple-100 dark:bg-purple-950/40 rounded-2xl p-4 text-center font-bold text-base">
                <div className="text-3xl mb-1">{c.emoji}</div>
                {c.name}
              </div>
            ))}
          </div>
        );
      case "wheelCategory":
        return <WheelCategory gameData={gd} />;
      case "hiddenPictureIntro":
        return <HiddenPictureSlide gameData={gd} revealed={answerRevealed} onReveal={() => setAnswerRevealed(true)} isIntro />;
      case "hiddenPictureQuestion":
        return <HiddenPictureSlide gameData={gd} revealed={answerRevealed} onReveal={() => setAnswerRevealed(true)} />;
      case "hiddenPictureReveal":
        return <HiddenPictureSlide gameData={gd} revealed={true} onReveal={() => {}} isFinal />;
      default:
        return null;
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeSlide { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(60px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: scale(1); } }
        @keyframes flipIn { from { opacity: 0; transform: rotateY(-25deg) scale(0.95); } to { opacity: 1; transform: rotateY(0deg) scale(1); } }
        @keyframes bulletReveal { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fade-slide { animation: fadeSlide 0.45s cubic-bezier(.4,0,.2,1) both; }
        .animate-slide-in { animation: slideIn 0.4s cubic-bezier(.4,0,.2,1) both; }
        .animate-zoom-in { animation: zoomIn 0.38s cubic-bezier(.4,0,.2,1) both; }
        .animate-flip-in { animation: flipIn 0.5s cubic-bezier(.4,0,.2,1) both; perspective: 800px; }
        .bullet-reveal { animation: bulletReveal 0.3s ease-out both; }
      `}</style>

      <div
        className="fixed inset-0 z-50 bg-gradient-to-br from-primary/95 via-background to-accent/95 flex flex-col"
        data-testid="slideshow-modal"
      >
        <div className="flex items-center justify-between p-3 md:p-4 bg-black/30 sticky top-0 z-10">
          <Button
            variant="outline" size="sm" onClick={onClose}
            className="bg-white text-foreground hover:bg-gray-100 font-medium"
            data-testid="button-close-slideshow"
          >
            <X className="h-4 w-4 mr-1" /> Close
          </Button>
          <h2 className="text-white font-semibold text-sm md:text-lg truncate flex-1 text-center mx-2">{title}</h2>
          <span className="text-white/80 text-sm whitespace-nowrap">{currentSlide + 1} / {slides.length}</span>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div key={animKey} className={`max-w-5xl w-full mx-auto rounded-xl shadow-2xl p-4 md:p-8 lg:p-10 ${animClass} ${isGameSlide ? gameSlideClass : "bg-white dark:bg-card"}`}>

            {/* Slide title */}
            <h3 className={`text-xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6 ${
              slideType === "jeopardyClue" ? "text-yellow-300 text-center" :
              slideType === "trueFalse" ? "text-white text-center" :
              "text-foreground"
            }`}>
              {slide.title}
            </h3>

            {/* Game slide content */}
            {isGameSlide ? (
              renderGameSlide()
            ) : (
              /* Standard slide content */
              <>
                {slide.image && visibleContent.length > 0 ? (
                  <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                    <div className="md:w-2/5 flex-shrink-0">
                      <img src={slide.image} alt={slide.title} className="w-full h-auto rounded-xl shadow-lg" data-testid={`slideshow-img-${currentSlide}`} />
                    </div>
                    <div className="md:w-3/5">
                      <ul className="space-y-3 md:space-y-4">
                        {visibleContent.map((point, i) => (
                          <li key={i} className="flex items-start gap-3 text-base md:text-lg text-muted-foreground bullet-reveal" style={{ animationDelay: `${i * 0.05}s` }}>
                            <span className="text-primary text-xl leading-none mt-0.5">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                      {revealHint && (
                        <div className="mt-6 flex items-center gap-2 text-muted-foreground/60 text-sm animate-pulse">
                          <Hand className="w-4 h-4" />
                          <span>{bulletCount - Math.floor(revealedCount)} more point{bulletCount - Math.floor(revealedCount) !== 1 ? "s" : ""} — tap to reveal</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {slide.image && (
                      <div className="mb-4 md:mb-6">
                        <img src={slide.image} alt={slide.title} className="w-full max-w-lg mx-auto h-auto rounded-xl shadow-lg" data-testid={`slideshow-img-${currentSlide}`} />
                      </div>
                    )}
                    {visibleContent.length > 0 && (
                      <ul className="space-y-3 md:space-y-4">
                        {visibleContent.map((point, i) => (
                          <li key={i} className="flex items-start gap-3 text-base md:text-lg text-muted-foreground bullet-reveal" style={{ animationDelay: `${i * 0.05}s` }}>
                            <span className="text-primary text-xl leading-none mt-0.5">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {revealHint && slide.content && slide.content.length > 0 && (
                      <div className="mt-6 flex items-center gap-2 text-muted-foreground/60 text-sm animate-pulse">
                        <Hand className="w-4 h-4" />
                        <span>{bulletCount - Math.floor(revealedCount)} more point{bulletCount - Math.floor(revealedCount) !== 1 ? "s" : ""} — tap to reveal</span>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {slide.notes && (
              <div className="mt-6 pt-4 border-t border-white/20">
                <p className={`text-sm italic ${isGameSlide && (slideType === "jeopardyClue" || slideType === "trueFalse") ? "text-white/60" : "text-muted-foreground"}`}>
                  🗒️ Speaker notes: {slide.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {nextSlideHint && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="flex items-center gap-2 bg-primary/80 text-white px-4 py-2 rounded-full text-sm animate-pulse">
              <ChevronRight className="w-4 h-4" /> Tap to go to next slide
            </div>
          </div>
        )}

        {transitionDelay && transitionDelay > 0 && (
          <div className="absolute top-16 right-4 z-10 pointer-events-none">
            <div className="bg-black/40 text-white/70 text-xs px-2 py-1 rounded-full">
              Auto {transitionDelay}s
            </div>
          </div>
        )}

        <div className="absolute bottom-16 right-4 z-10">
          <BrightBoardLogo show={true} size="md" absolute={false} />
        </div>

        <div className="flex items-center justify-between gap-2 p-3 md:p-4 bg-black/30 sticky bottom-0">
          <Button
            variant="ghost" onClick={goPrev} disabled={currentSlide === 0}
            className="text-white hover:bg-white/20 disabled:opacity-30"
            data-testid="button-prev-slide"
          >
            <ChevronLeft className="h-5 w-5 md:mr-1" />
            <span className="hidden md:inline">Previous</span>
          </Button>

          <Button
            variant="outline" size="sm" onClick={onClose}
            className="bg-white text-foreground hover:bg-gray-100 font-medium md:hidden"
            data-testid="button-back-mobile"
          >
            Back to Dashboard
          </Button>

          <Button
            variant="ghost" onClick={goNext}
            disabled={currentSlide === slides.length - 1}
            className="text-white hover:bg-white/20 disabled:opacity-30"
            data-testid="button-next-slide"
          >
            <span className="hidden md:inline">Next</span>
            <ChevronRight className="h-5 w-5 md:ml-1" />
          </Button>
        </div>
      </div>
    </>
  );
}
