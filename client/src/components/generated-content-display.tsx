import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, Check, RefreshCw, Loader2, FileDown, Play } from "lucide-react";
import { useState } from "react";
import type { ContentType, Slide, Activity, StoryboardFrame } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { SlideshowModal } from "./slideshow-modal";
import pptxgen from "pptxgenjs";

interface GeneratedContentDisplayProps {
  type: ContentType;
  content: string;
  isLoading: boolean;
  onRegenerate?: () => void;
}

export function GeneratedContentDisplay({
  type,
  content,
  isLoading,
  onRegenerate,
}: GeneratedContentDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const { toast } = useToast();

  const getPresentationData = () => {
    if (type !== "presentation") return { slides: [], title: "" };
    try {
      const data = JSON.parse(content);
      return { slides: data.slides || [], title: data.title || "Presentation" };
    } catch {
      return { slides: [], title: "" };
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center min-h-[400px] animate-pulse-glow">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary via-accent to-chart-4 animate-gradient" />
          <Loader2 className="h-10 w-10 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
        </div>
        <p className="mt-6 text-lg font-medium">Creating your content...</p>
        <p className="mt-2 text-sm text-muted-foreground">This may take a moment</p>
      </Card>
    );
  }

  if (!content) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center min-h-[400px] bg-muted/30">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">Your content will appear here</p>
        <p className="mt-1 text-sm text-muted-foreground">Choose a type and describe what you want to create</p>
      </Card>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brightboard-${type}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPPT = async () => {
    try {
      const data = JSON.parse(content);
      const slides: Slide[] = data.slides || [];
      
      if (slides.length === 0) {
        toast({
          title: "No slides found",
          description: "This presentation doesn't have any slides to download.",
          variant: "destructive",
        });
        return;
      }

      const pptx = new pptxgen();
      pptx.title = data.title || "Presentation";
      pptx.author = "BrightBoard";
      pptx.layout = "LAYOUT_16x9";

      const layout = data.layout || "single";
      const slideData = slides as (Slide & { images?: string[] })[];

      slideData.forEach((slide) => {
        const pptSlide = pptx.addSlide();
        const hasImage = slide.image || (slide.images && slide.images.length > 0);
        const hasContent = slide.content && slide.content.length > 0;
        
        // Title
        pptSlide.addText(slide.title || "Slide", {
          x: 0.5,
          y: 0.3,
          w: 9,
          h: 0.7,
          fontSize: 32,
          bold: true,
          color: "363636",
        });

        // Layout with image on left, content on right (or just content if no image)
        // 16:9 slide is 10" x 5.625" - use 90%+ of available space
        if (hasImage && layout === "single" && slide.image) {
          if (hasContent) {
            // Image on left (larger), content on right
            pptSlide.addImage({
              data: slide.image,
              x: 0.3,
              y: 1.1,
              w: 4.8,
              h: 4.2,
            });
            
            const bulletPoints = slide.content.map(point => ({
              text: point,
              options: { bullet: true, fontSize: 18, color: "555555", breakLine: true }
            }));
            pptSlide.addText(bulletPoints, {
              x: 5.3,
              y: 1.1,
              w: 4.4,
              h: 4.2,
              valign: "top",
            });
          } else {
            // Image only - center and fill most of the slide
            pptSlide.addImage({
              data: slide.image,
              x: 0.5,
              y: 1.1,
              w: 9,
              h: 4.3,
              sizing: { type: "contain", w: 9, h: 4.3 },
            });
          }
        } else if (hasImage && layout === "grid" && slide.images && slide.images.length > 0) {
          // Grid of images (2x2) - larger images
          const imgSize = 2.15;
          const gridPositions = [
            { x: 0.3, y: 1.1 },
            { x: 2.6, y: 1.1 },
            { x: 0.3, y: 3.35 },
            { x: 2.6, y: 3.35 },
          ];
          
          slide.images.slice(0, 4).forEach((img, idx) => {
            pptSlide.addImage({
              data: img,
              x: gridPositions[idx].x,
              y: gridPositions[idx].y,
              w: imgSize,
              h: imgSize,
            });
          });
          
          // Content on right of grid
          if (hasContent) {
            const bulletPoints = slide.content.map(point => ({
              text: point,
              options: { bullet: true, fontSize: 16, color: "555555", breakLine: true }
            }));
            pptSlide.addText(bulletPoints, {
              x: 5.0,
              y: 1.1,
              w: 4.7,
              h: 4.2,
              valign: "top",
            });
          }
        } else if (hasContent) {
          // No image, just content
          const bulletPoints = slide.content.map(point => ({
            text: point,
            options: { bullet: true, fontSize: 20, color: "555555", breakLine: true }
          }));
          pptSlide.addText(bulletPoints, {
            x: 0.5,
            y: 1.2,
            w: 9,
            h: 4,
            valign: "top",
          });
        }

        // Speaker notes
        if (slide.notes) {
          pptSlide.addNotes(slide.notes);
        }
      });

      await pptx.writeFile({ fileName: `${data.title || "presentation"}.pptx` });
      toast({
        title: "Download started",
        description: "Your PowerPoint file is being downloaded.",
      });
    } catch (error) {
      console.error("Error generating PPT:", error);
      toast({
        title: "Download failed",
        description: "Could not create the PowerPoint file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderContent = () => {
    switch (type) {
      case "image":
        return <ImageContent content={content} />;
      case "presentation":
        return <PresentationContent content={content} />;
      case "text":
        return <TextContent content={content} />;
      case "activity":
        return <ActivityContent content={content} />;
      case "storyboard":
        return <StoryboardContent content={content} />;
      default:
        return <TextContent content={content} />;
    }
  };

  return (
    <Card className="p-5 overflow-hidden">
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <Badge variant="secondary" className="capitalize">
          {type}
        </Badge>
        <div className="flex items-center gap-2 flex-wrap">
          {onRegenerate && (
            <Button variant="outline" size="sm" onClick={onRegenerate} data-testid="button-regenerate">
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Regenerate
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleCopy} data-testid="button-copy">
            {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
          {type === "presentation" && (
            <>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => setShowSlideshow(true)} 
                data-testid="button-present"
              >
                <Play className="h-4 w-4 mr-1.5" />
                Present
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPPT} data-testid="button-download-ppt">
                <FileDown className="h-4 w-4 mr-1.5" />
                Download PPT
              </Button>
            </>
          )}
          {type === "storyboard" ? (
            <Button variant="outline" size="sm" onClick={handleDownload} data-testid="button-download">
              <Download className="h-4 w-4 mr-1.5" />
              Save Script
            </Button>
          ) : type !== "presentation" && (
            <Button variant="outline" size="sm" onClick={handleDownload} data-testid="button-download">
              <Download className="h-4 w-4 mr-1.5" />
              Download
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-auto max-h-[600px]">
        {renderContent()}
      </div>
      
      {type === "presentation" && (
        <SlideshowModal
          slides={getPresentationData().slides}
          title={getPresentationData().title}
          isOpen={showSlideshow}
          onClose={() => setShowSlideshow(false)}
        />
      )}
    </Card>
  );
}

function Sparkles({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

function ImageContent({ content }: { content: string }) {
  try {
    const data = JSON.parse(content);
    if (data.imageUrl || data.b64_json) {
      const imgSrc = data.imageUrl || `data:image/png;base64,${data.b64_json}`;
      return (
        <div className="space-y-4">
          <div className="rounded-lg overflow-hidden border">
            <img
              src={imgSrc}
              alt="Generated educational image"
              className="w-full h-auto"
              data-testid="img-generated"
            />
          </div>
          {data.title && (
            <h3 className="font-semibold text-lg">{data.title}</h3>
          )}
          {data.description && (
            <p className="text-muted-foreground">{data.description}</p>
          )}
        </div>
      );
    }
  } catch {
    // Not JSON or no image data
  }
  return <TextContent content={content} />;
}

function PresentationContent({ content }: { content: string }) {
  try {
    const data = JSON.parse(content);
    const slides: (Slide & { images?: string[] })[] = data.slides || [];
    const layout = data.layout || "single";
    const style = data.style || "textAndImages";

    if (slides.length > 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-xl">{data.title || "Presentation"}</h3>
            <div className="flex gap-2">
              {style && (
                <Badge variant="outline" data-testid="badge-presentation-style">
                  {style === "textAndImages" ? "Text + Images" : style === "imagesOnly" ? "Images Only" : "Text Only"}
                </Badge>
              )}
              {layout && style !== "textOnly" && (
                <Badge variant="outline" data-testid="badge-presentation-layout">
                  {layout === "grid" ? "Grid Layout" : "Single Image"}
                </Badge>
              )}
            </div>
          </div>
          <div className="grid gap-4">
            {slides.map((slide, index) => (
              <Card key={index} className="p-4 bg-muted/30">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <h4 className="font-semibold text-base">{slide.title}</h4>
                  </div>
                  
                  {/* Grid layout - multiple images */}
                  {layout === "grid" && slide.images && slide.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 ml-11">
                      {slide.images.map((img, imgIndex) => (
                        <img 
                          key={imgIndex}
                          src={img} 
                          alt={`${slide.title} - Image ${imgIndex + 1}`}
                          className="w-full h-auto rounded-lg border shadow-sm aspect-square object-cover"
                          data-testid={`img-slide-${index}-${imgIndex}`}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Single layout - one image */}
                  {layout !== "grid" && slide.image && (
                    <div className="ml-11">
                      <img 
                        src={slide.image} 
                        alt={slide.title}
                        className="w-full max-w-md h-auto rounded-lg border shadow-sm"
                        data-testid={`img-slide-${index}`}
                      />
                    </div>
                  )}
                  
                  {/* Text content (if not images-only or if has content) */}
                  {slide.content && slide.content.length > 0 && (
                    <ul className="space-y-1.5 ml-11">
                      {slide.content.map((point, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  {slide.notes && (
                    <p className="text-xs text-muted-foreground italic border-t pt-2 ml-11">
                      Speaker notes: {slide.notes}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
  } catch {
    // Not valid JSON
  }
  return <TextContent content={content} />;
}

function TextContent({ content }: { content: string }) {
  try {
    const data = JSON.parse(content);
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {data.title && <h2 className="text-xl font-bold mb-3">{data.title}</h2>}
        <div className="whitespace-pre-wrap">{data.content || data.text || content}</div>
      </div>
    );
  } catch {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    );
  }
}

function ActivityContent({ content }: { content: string }) {
  try {
    const data = JSON.parse(content);
    const activity: Activity = data;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-xl">{activity.title}</h3>
          <Badge variant="outline" className="capitalize">{activity.type}</Badge>
        </div>
        <p className="text-muted-foreground">{activity.instructions}</p>
        
        <div className="grid gap-3 mt-4">
          {activity.items?.map((item, index) => (
            <Card key={index} className="p-3 bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-xs">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.question}</p>
                  <p className="text-sm text-accent mt-1">Answer: {item.answer}</p>
                  {item.options && item.options.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {item.options.map((opt, i) => (
                        <Badge
                          key={i}
                          variant={opt === item.answer ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {opt}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  } catch {
    return <TextContent content={content} />;
  }
}

function StoryboardContent({ content }: { content: string }) {
  try {
    const data = JSON.parse(content);
    const frames: StoryboardFrame[] = data.frames || [];

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-bold text-xl">{data.title || "Video Plan"}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              This is a planning document for creating your video. Use it as a script and guide for video production.
            </p>
          </div>
        </div>
        {data.description && (
          <p className="text-muted-foreground">{data.description}</p>
        )}
        
        <div className="flex flex-wrap gap-2">
          {data.duration && (
            <Badge variant="outline" data-testid="badge-duration">{data.duration}</Badge>
          )}
          {data.style && (
            <Badge variant="outline" data-testid="badge-style">{data.style}</Badge>
          )}
          {data.quality && (
            <Badge variant="outline" data-testid="badge-quality">{data.quality}</Badge>
          )}
          {data.targetAge && (
            <Badge variant="secondary" data-testid="badge-target-age">{data.targetAge}</Badge>
          )}
        </div>
        
        <div className="grid gap-4">
          {frames.map((frame, index) => (
            <Card key={index} className="p-4 bg-gradient-to-r from-muted/50 to-muted/20">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="flex-shrink-0 w-full sm:w-32">
                  {frame.image ? (
                    <img 
                      src={frame.image} 
                      alt={`Frame ${frame.frameNumber}`}
                      className="w-full h-auto rounded-lg border shadow-sm"
                      data-testid={`img-frame-${index}`}
                    />
                  ) : (
                    <div className="w-full aspect-video sm:w-32 sm:h-24 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                      <span className="text-xs text-muted-foreground text-center px-2">
                        Frame {frame.frameNumber}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="font-medium text-sm">{frame.description}</p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Action:</strong> {frame.action}
                  </p>
                  {frame.dialogue && (
                    <p className="text-xs italic text-accent">
                      "{frame.dialogue}"
                    </p>
                  )}
                  {!frame.image && (
                    <p className="text-xs text-muted-foreground/70">
                      <strong>Visual:</strong> {frame.imagePrompt}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  } catch {
    return <TextContent content={content} />;
  }
}
