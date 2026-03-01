import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import type { Slide } from "@shared/schema";
import { BrightBoardLogo } from "./brightboard-logo";

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
      {/* Header with prominent close button */}
      <div className="flex items-center justify-between p-3 md:p-4 bg-black/30 sticky top-0 z-10">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onClose}
          className="bg-white text-foreground hover:bg-gray-100 font-medium"
          data-testid="button-close-slideshow"
        >
          <X className="h-4 w-4 mr-1" />
          Close
        </Button>
        <h2 className="text-white font-semibold text-sm md:text-lg truncate flex-1 text-center mx-2">{title}</h2>
        <span className="text-white/80 text-sm whitespace-nowrap">
          {currentSlide + 1} / {slides.length}
        </span>
      </div>

      {/* Slide content - scrollable */}
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-4xl w-full mx-auto bg-white dark:bg-card rounded-xl shadow-2xl p-4 md:p-8 lg:p-12">
          {slide.image && (
            <div className="mb-4 md:mb-6">
              <img 
                src={slide.image} 
                alt={slide.title}
                className="w-full max-w-md mx-auto h-auto rounded-xl shadow-lg"
                data-testid={`slideshow-img-${currentSlide}`}
              />
            </div>
          )}
          <h3 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4 md:mb-6">
            {slide.title}
          </h3>
          {slide.content && slide.content.length > 0 && (
            <ul className="space-y-3 md:space-y-4">
              {slide.content.map((point, i) => (
                <li key={i} className="flex items-start gap-3 text-base md:text-lg text-muted-foreground">
                  <span className="text-primary text-xl leading-none mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
          {slide.notes && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground italic">
                Speaker notes: {slide.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* BrightBoard Logo */}
      <div className="absolute bottom-16 right-4 z-10">
        <BrightBoardLogo show={true} size="md" absolute={false} />
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between gap-2 p-3 md:p-4 bg-black/30 sticky bottom-0">
        <Button
          variant="ghost"
          onClick={goPrev}
          disabled={currentSlide === 0}
          className="text-white hover:bg-white/20 disabled:opacity-30"
          data-testid="button-prev-slide"
        >
          <ChevronLeft className="h-5 w-5 md:mr-1" />
          <span className="hidden md:inline">Previous</span>
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onClose}
          className="bg-white text-foreground hover:bg-gray-100 font-medium md:hidden"
          data-testid="button-back-mobile"
        >
          Back to Dashboard
        </Button>
        
        <Button
          variant="ghost"
          onClick={goNext}
          disabled={currentSlide === slides.length - 1}
          className="text-white hover:bg-white/20 disabled:opacity-30"
          data-testid="button-next-slide"
        >
          <span className="hidden md:inline">Next</span>
          <ChevronRight className="h-5 w-5 md:ml-1" />
        </Button>
      </div>
    </div>
  );
}
