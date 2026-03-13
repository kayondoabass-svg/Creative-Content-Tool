import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Hand } from "lucide-react";
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
}

const TRANSITION_STYLES: Record<string, string> = {
  fade: "animate-fade-slide",
  slide: "animate-slide-in",
  zoom: "animate-zoom-in",
  flip: "animate-flip-in",
};

export function SlideshowModal({ slides, title, isOpen, onClose, transition, transitionDelay, tapToReveal }: SlideshowModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [revealedCount, setRevealedCount] = useState(tapToReveal ? 0 : Infinity);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slide = slides[currentSlide];
  const bulletCount = slide?.content?.length ?? 0;
  const allRevealed = revealedCount >= bulletCount;

  const advanceSlide = useCallback(() => {
    setCurrentSlide(prev => {
      if (prev < slides.length - 1) {
        setAnimKey(k => k + 1);
        setRevealedCount(tapToReveal ? 0 : Infinity);
        return prev + 1;
      }
      return prev;
    });
  }, [slides.length, tapToReveal]);

  const goNext = useCallback(() => {
    if (tapToReveal && !allRevealed) {
      setRevealedCount(prev => prev + 1);
    } else {
      advanceSlide();
    }
  }, [tapToReveal, allRevealed, advanceSlide]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
      setAnimKey(k => k + 1);
      setRevealedCount(tapToReveal ? 0 : Infinity);
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

  const revealHint = tapToReveal && !allRevealed;
  const nextSlideHint = tapToReveal && allRevealed && currentSlide < slides.length - 1;

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
        onClick={tapToReveal ? goNext : undefined}
        style={tapToReveal ? { cursor: "pointer" } : undefined}
      >
        <div className="flex items-center justify-between p-3 md:p-4 bg-black/30 sticky top-0 z-10" onClick={e => e.stopPropagation()}>
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

        <div className="flex-1 overflow-auto p-4 md:p-8" onClick={e => e.stopPropagation()}>
          <div key={animKey} className={`max-w-5xl w-full mx-auto bg-white dark:bg-card rounded-xl shadow-2xl p-4 md:p-8 lg:p-10 ${animClass}`}>
            <h3 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4 md:mb-6">
              {slide.title}
            </h3>

            {slide.image && visibleContent.length > 0 ? (
              <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                <div className="md:w-2/5 flex-shrink-0">
                  <img src={slide.image} alt={slide.title} className="w-full h-auto rounded-xl shadow-lg" data-testid={`slideshow-img-${currentSlide}`} />
                </div>
                <div className="md:w-3/5">
                  <ul className="space-y-3 md:space-y-4">
                    {visibleContent.map((point, i) => (
                      <li key={i} className={`flex items-start gap-3 text-base md:text-lg text-muted-foreground bullet-reveal`} style={{ animationDelay: `${i * 0.05}s` }}>
                        <span className="text-primary text-xl leading-none mt-0.5">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  {tapToReveal && !allRevealed && (
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
                      <li key={i} className={`flex items-start gap-3 text-base md:text-lg text-muted-foreground bullet-reveal`} style={{ animationDelay: `${i * 0.05}s` }}>
                        <span className="text-primary text-xl leading-none mt-0.5">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {tapToReveal && !allRevealed && slide.content && slide.content.length > 0 && (
                  <div className="mt-6 flex items-center gap-2 text-muted-foreground/60 text-sm animate-pulse">
                    <Hand className="w-4 h-4" />
                    <span>{bulletCount - Math.floor(revealedCount)} more point{bulletCount - Math.floor(revealedCount) !== 1 ? "s" : ""} — tap to reveal</span>
                  </div>
                )}
              </>
            )}

            {slide.notes && (
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm text-muted-foreground italic">Speaker notes: {slide.notes}</p>
              </div>
            )}
          </div>
        </div>

        {tapToReveal && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            {revealHint && (
              <div className="flex items-center gap-2 bg-black/50 text-white px-4 py-2 rounded-full text-sm animate-pulse">
                <Hand className="w-4 h-4" /> Tap anywhere to reveal next point
              </div>
            )}
            {nextSlideHint && (
              <div className="flex items-center gap-2 bg-primary/80 text-white px-4 py-2 rounded-full text-sm animate-pulse">
                <ChevronRight className="w-4 h-4" /> Tap to go to next slide
              </div>
            )}
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

        <div className="flex items-center justify-between gap-2 p-3 md:p-4 bg-black/30 sticky bottom-0" onClick={e => e.stopPropagation()}>
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
            disabled={currentSlide === slides.length - 1 && allRevealed}
            className="text-white hover:bg-white/20 disabled:opacity-30"
            data-testid="button-next-slide"
          >
            <span className="hidden md:inline">
              {tapToReveal && !allRevealed ? "Reveal" : "Next"}
            </span>
            <ChevronRight className="h-5 w-5 md:ml-1" />
          </Button>
        </div>
      </div>
    </>
  );
}
