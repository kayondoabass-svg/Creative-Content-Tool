import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import type { Slide } from "@shared/schema";

interface SlideshowModalProps {
  slides: Slide[];
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SlideshowModal({ slides, title, isOpen, onClose }: SlideshowModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const goNext = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  }, [currentSlide, slides.length]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  }, [currentSlide]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, goNext, goPrev, onClose]);

  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || slides.length === 0) return null;

  const slide = slides[currentSlide];

  return (
    <div 
      className="fixed inset-0 z-50 bg-gradient-to-br from-primary/95 via-background to-accent/95 flex flex-col"
      data-testid="slideshow-modal"
    >
      <div className="flex items-center justify-between p-4 bg-black/20">
        <h2 className="text-white font-semibold text-lg truncate">{title}</h2>
        <div className="flex items-center gap-4">
          <span className="text-white/70 text-sm">
            {currentSlide + 1} / {slides.length}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-white hover:bg-white/20"
            data-testid="button-close-slideshow"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div className="max-w-4xl w-full bg-white dark:bg-card rounded-xl shadow-2xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row gap-8">
            {slide.image && (
              <div className="flex-shrink-0 md:w-1/3">
                <img 
                  src={slide.image} 
                  alt={slide.title}
                  className="w-full h-auto rounded-xl shadow-lg"
                  data-testid={`slideshow-img-${currentSlide}`}
                />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-2xl md:text-4xl font-bold text-foreground mb-8">
                {slide.title}
              </h3>
              <ul className="space-y-4">
                {slide.content.map((point, i) => (
                  <li key={i} className="flex items-start gap-4 text-lg md:text-xl text-muted-foreground">
                    <span className="text-primary text-2xl leading-none">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              {slide.notes && (
                <div className="mt-8 pt-6 border-t">
                  <p className="text-sm text-muted-foreground italic">
                    Speaker notes: {slide.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 p-4 bg-black/20">
        <Button
          variant="ghost"
          size="lg"
          onClick={goPrev}
          disabled={currentSlide === 0}
          className="text-white hover:bg-white/20 disabled:opacity-30"
          data-testid="button-prev-slide"
        >
          <ChevronLeft className="h-6 w-6 mr-2" />
          Previous
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={goNext}
          disabled={currentSlide === slides.length - 1}
          className="text-white hover:bg-white/20 disabled:opacity-30"
          data-testid="button-next-slide"
        >
          Next
          <ChevronRight className="h-6 w-6 ml-2" />
        </Button>
      </div>
    </div>
  );
}
