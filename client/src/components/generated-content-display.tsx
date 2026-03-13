import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, Check, RefreshCw, Loader2, FileDown, Play, Sparkles, FileText, Image as ImageIcon, Film, Gamepad2, Crown } from "lucide-react";
import { useState } from "react";
import type { ContentType, Slide, Activity, StoryboardFrame, Worksheet, GameType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { SlideshowModal } from "./slideshow-modal";
import { VideoExportModal } from "./video-export-modal";
import { GamePlayerModal } from "./game-player-modal";
import { BrightBoardLogo } from "./brightboard-logo";
import { MindmapCanvas } from "./mindmap-canvas";
import pptxgen from "pptxgenjs";
import JSZip from "jszip";
import { apiRequest } from "@/lib/queryClient";

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
  const [showVideoExport, setShowVideoExport] = useState(false);
  const [showGamePlayer, setShowGamePlayer] = useState(false);
  const { toast } = useToast();

  const getActivityData = () => {
    if (type !== "activity") return null;
    try {
      const data = JSON.parse(content);
      return {
        title: data.title || data.gameName || "Interactive Game",
        gameType: (data.gameType || "brainBattle") as GameType,
        gameData: data,
      };
    } catch {
      return null;
    }
  };

  const getPresentationData = () => {
    if (type !== "presentation") return { slides: [], title: "", transition: undefined, transitionDelay: undefined, tapToReveal: undefined };
    try {
      const data = JSON.parse(content);
      return {
        slides: data.slides || [],
        title: data.title || "Presentation",
        transition: data.transition,
        transitionDelay: data.transitionDelay,
        tapToReveal: !!data.tapToReveal,
      };
    } catch {
      return { slides: [], title: "", transition: undefined, transitionDelay: undefined, tapToReveal: undefined };
    }
  };

  const getStoryboardData = () => {
    if (type !== "storyboard") return null;
    try {
      const data = JSON.parse(content);
      return {
        title: data.title || "Video",
        description: data.description,
        frames: data.frames || [],
      };
    } catch {
      return null;
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
    if (type === "mindmap") {
      const container = document.getElementById("mindmap-svg-root");
      const svg = container?.querySelector("svg");
      if (!svg) {
        toast({ title: "Error", description: "Could not find mind map to export.", variant: "destructive" });
        return;
      }
      const viewBox = svg.getAttribute("viewBox") || "0 0 1500 1300";
      const parts = viewBox.split(" ");
      const svgW = parseFloat(parts[2]) || 1500;
      const svgH = parseFloat(parts[3]) || 1300;
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("width", String(svgW));
      clone.setAttribute("height", String(svgH));
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
      const svgStr = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = svgW * scale;
        canvas.height = svgH * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, svgW, svgH);
        URL.revokeObjectURL(svgUrl);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `brightboard-mindmap-${Date.now()}.jpg`;
          a.click();
        }, "image/jpeg", 0.95);
      };
      img.src = svgUrl;
      return;
    }
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brightboard-${type}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenVideoExport = () => {
    const storyboardData = getStoryboardData();
    if (!storyboardData) {
      toast({
        title: "Error",
        description: "Could not parse storyboard data.",
        variant: "destructive",
      });
      return;
    }
    
    const framesWithImages = storyboardData.frames.filter((f: any) => f.image);
    if (framesWithImages.length === 0) {
      toast({
        title: "No images available",
        description: "Generate images for your storyboard first before exporting as video.",
        variant: "destructive",
      });
      return;
    }
    
    setShowVideoExport(true);
  };

  const handleDownloadPPT = async () => {
    try {
      const data = JSON.parse(content);
      const slides: Slide[] = data.slides || [];
      const tapToReveal: boolean = !!data.tapToReveal;
      const transition: string = data.transition || "none";
      const transitionDelay: number = data.transitionDelay || 0;

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

      const addSlideContent = (slide: Slide & { images?: string[] }, visibleBullets: string[]) => {
        const pptSlide = pptx.addSlide();
        const hasImage = !!(slide.image || (slide.images && slide.images.length > 0));
        const hasContent = visibleBullets.length > 0;

        pptSlide.addText(slide.title || "Slide", {
          x: 0.5, y: 0.3, w: 9, h: 0.7,
          fontSize: 32, bold: true, color: "363636",
        });

        if (hasImage && layout === "single" && slide.image) {
          if (hasContent) {
            pptSlide.addImage({ data: slide.image, x: 0.3, y: 1.1, w: 4.8, h: 4.2 });
            pptSlide.addText(
              visibleBullets.map(point => ({ text: point, options: { bullet: true, fontSize: 18, color: "555555", breakLine: true } })),
              { x: 5.3, y: 1.1, w: 4.4, h: 4.2, valign: "top" }
            );
          } else {
            pptSlide.addImage({ data: slide.image, x: 0.5, y: 1.1, w: 9, h: 4.3, sizing: { type: "contain", w: 9, h: 4.3 } });
          }
        } else if (hasImage && layout === "grid" && slide.images && slide.images.length > 0) {
          const imgSize = 2.15;
          const gridPos = [{ x: 0.3, y: 1.1 }, { x: 2.6, y: 1.1 }, { x: 0.3, y: 3.35 }, { x: 2.6, y: 3.35 }];
          slide.images.slice(0, 4).forEach((img, idx) => {
            pptSlide.addImage({ data: img, x: gridPos[idx].x, y: gridPos[idx].y, w: imgSize, h: imgSize });
          });
          if (hasContent) {
            pptSlide.addText(
              visibleBullets.map(point => ({ text: point, options: { bullet: true, fontSize: 16, color: "555555", breakLine: true } })),
              { x: 5.0, y: 1.1, w: 4.7, h: 4.2, valign: "top" }
            );
          }
        } else if (hasContent) {
          pptSlide.addText(
            visibleBullets.map(point => ({ text: point, options: { bullet: true, fontSize: 20, color: "555555", breakLine: true } })),
            { x: 0.5, y: 1.2, w: 9, h: 4, valign: "top" }
          );
        }

        if (slide.notes) pptSlide.addNotes(slide.notes);

        pptSlide.addText("brightboardapp.com", {
          x: 7.2, y: 5.2, w: 2.5, h: 0.3,
          fontSize: 9, color: "999999", align: "right", italic: true,
        });
      };

      slideData.forEach((slide) => {
        const allBullets = slide.content || [];
        if (tapToReveal && allBullets.length > 1) {
          // Build slides: one slide per reveal step (each shows one more bullet)
          for (let i = 1; i <= allBullets.length; i++) {
            addSlideContent(slide, allBullets.slice(0, i));
          }
        } else {
          addSlideContent(slide, allBullets);
        }
      });

      // Generate the PPTX as a Blob, then post-process with JSZip to inject transitions
      const needsPostProcess = transition && transition !== "none" || transitionDelay > 0;
      if (needsPostProcess) {
        const pptxBlob = await pptx.write({ outputType: "blob" }) as Blob;
        const zip = await JSZip.loadAsync(pptxBlob);

        // Map transition name to OpenXML element
        const transitionElementMap: Record<string, string> = {
          fade:  "<p:fade/>",
          slide: '<p:push dir="l"/>',
          zoom:  "<p:zoom/>",
          flip:  "<p:flip/>",
        };
        const transEl = transitionElementMap[transition] || "<p:fade/>";
        // advTm in ms; advClick="1" so manual advance still works; advAuto for auto-advance
        const advAttr = transitionDelay > 0 ? ` advTm="${transitionDelay * 1000}"` : "";
        const transitionXml = `<p:transition dur="400" advClick="1"${advAttr}>${transEl}</p:transition>`;

        // Inject into each slide XML
        const slideFiles = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide[0-9]+\.xml$/.test(f));
        await Promise.all(slideFiles.map(async (filePath) => {
          let xml = await zip.files[filePath].async("string");
          // Insert before closing </p:sld> tag
          xml = xml.replace(/<\/p:sld>/, `${transitionXml}</p:sld>`);
          zip.file(filePath, xml);
        }));

        const modifiedBlob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
        const url = URL.createObjectURL(modifiedBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${data.title || "presentation"}.pptx`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } else {
        await pptx.writeFile({ fileName: `${data.title || "presentation"}.pptx` });
      }

      toast({
        title: "Download started",
        description: tapToReveal
          ? "Downloaded with tap-to-reveal build slides — advance slides in PowerPoint to reveal each point."
          : "Your PowerPoint file is being downloaded.",
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
      case "worksheet":
        return <WorksheetContent content={content} />;
      case "mindmap":
        return <MindmapContent content={content} />;
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
            <>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleOpenVideoExport}
                data-testid="button-download-mp4"
              >
                <Film className="h-4 w-4 mr-1.5" />
                Export Video
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} data-testid="button-download">
                <Download className="h-4 w-4 mr-1.5" />
                Save Script
              </Button>
            </>
          ) : type === "worksheet" ? (
            <WorksheetDownloadButtons content={content} toast={toast} />
          ) : type === "activity" ? (
            <>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => setShowGamePlayer(true)}
                data-testid="button-play-game"
              >
                <Gamepad2 className="h-4 w-4 mr-1.5" />
                Play Game
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} data-testid="button-download">
                <Download className="h-4 w-4 mr-1.5" />
                Download
              </Button>
            </>
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
      
      {type === "presentation" && (() => {
        const pd = getPresentationData();
        return (
          <SlideshowModal
            slides={pd.slides}
            title={pd.title}
            isOpen={showSlideshow}
            onClose={() => setShowSlideshow(false)}
            transition={pd.transition}
            transitionDelay={pd.transitionDelay}
            tapToReveal={pd.tapToReveal}
          />
        );
      })()}
      
      {type === "storyboard" && (
        <VideoExportModal
          isOpen={showVideoExport}
          onClose={() => setShowVideoExport(false)}
          content={content}
          storyboardData={getStoryboardData()}
        />
      )}
      
      {type === "activity" && getActivityData() && (
        <GamePlayerModal
          isOpen={showGamePlayer}
          onClose={() => setShowGamePlayer(false)}
          gameType={getActivityData()!.gameType}
          gameData={getActivityData()!.gameData}
          title={getActivityData()!.title}
        />
      )}
    </Card>
  );
}

function ImageContent({ content }: { content: string }) {
  try {
    const data = JSON.parse(content);
    if (data.imageUrl || data.b64_json) {
      const imgSrc = data.imageUrl || `data:image/png;base64,${data.b64_json}`;
      return (
        <div className="space-y-4">
          <div className="rounded-lg overflow-hidden border relative">
            <img
              src={imgSrc}
              alt="Generated educational image"
              className="w-full h-auto"
              data-testid="img-generated"
            />
            <BrightBoardLogo show={true} />
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
    const imageStyle = data.imageStyle || "animation";
    const imageQuality = data.imageQuality || "hd";
    const transition = data.transition;
    const tapToReveal = data.tapToReveal;
    const hasWatermark = !!data.watermark;
    const showBranding = true;

    if (slides.length > 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xl">{data.title || "Presentation"}</h3>
              <div className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5" data-testid="logo-badge-title">
                <img src="/favicon.png" alt="BrightBoard" className="w-3.5 h-3.5 rounded" />
                <span className="text-muted-foreground text-[10px] font-medium">brightboardapp.com</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
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
              {style !== "textOnly" && (
                <Badge variant="secondary" data-testid="badge-presentation-image-style">
                  {imageStyle === "reallife" ? "Real Life" : "Animation"}
                </Badge>
              )}
              {style !== "textOnly" && (
                <Badge variant="secondary" data-testid="badge-presentation-image-quality">
                  {imageQuality.toUpperCase()}
                </Badge>
              )}
              {transition && transition !== "none" && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" data-testid="badge-presentation-transition">
                  {transition.charAt(0).toUpperCase() + transition.slice(1)} Transition
                </Badge>
              )}
              {transition && transition !== "none" && data.transitionDelay > 0 && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" data-testid="badge-transition-delay">
                  {data.transitionDelay}s Delay
                </Badge>
              )}
              {tapToReveal && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" data-testid="badge-tap-to-reveal">
                  Tap to Reveal
                </Badge>
              )}
            </div>
          </div>
          <div className="grid gap-4">
            {data.slideLimitReached && (
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3" data-testid="banner-slide-limit">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">You requested {data.requestedSlides} slides, but free accounts are limited to {data.maxFreeSlides} slides.</p>
                  <p className="text-xs text-muted-foreground">Upgrade to Premium for up to 20 slides per presentation, HD/4K images, and more.</p>
                </div>
                <a href="/pricing" className="flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity" data-testid="link-upgrade-slides">
                  Upgrade
                </a>
              </div>
            )}
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
                        <div key={imgIndex} className="relative">
                          <img 
                            src={img} 
                            alt={`${slide.title} - Image ${imgIndex + 1}`}
                            className="w-full h-auto rounded-lg border shadow-sm aspect-square object-cover"
                            data-testid={`img-slide-${index}-${imgIndex}`}
                          />
                          <BrightBoardLogo show={showBranding} />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Single layout - image + text side by side */}
                  {layout !== "grid" && slide.image && slide.content && slide.content.length > 0 ? (
                    <div className="flex flex-col sm:flex-row gap-3 ml-11">
                      <div className="sm:w-2/5 flex-shrink-0 relative">
                        <img 
                          src={slide.image} 
                          alt={slide.title}
                          className="w-full h-auto rounded-lg border shadow-sm"
                          data-testid={`img-slide-${index}`}
                        />
                        <BrightBoardLogo show={showBranding} />
                      </div>
                      <ul className="space-y-1.5 sm:w-3/5">
                        {slide.content.map((point, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <>
                      {layout !== "grid" && slide.image && (
                        <div className="ml-11 relative inline-block">
                          <img 
                            src={slide.image} 
                            alt={slide.title}
                            className="w-full max-w-md h-auto rounded-lg border shadow-sm"
                            data-testid={`img-slide-${index}`}
                          />
                          <BrightBoardLogo show={showBranding} />
                        </div>
                      )}
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
                    </>
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
    const game = data;
    const gameType = game.gameType || game.options?.gameType || "brainBattle";

    const gameTypeLabels: Record<string, string> = {
      luckySpinner: "Lucky Spinner",
      mysteryBox: "Mystery Box",
      memoryMatch: "Memory Match",
      quickCatch: "Quick Catch",
      factOrFib: "Fact or Fib",
      wordHunt: "Word Hunt",
      letterRescue: "Letter Rescue",
      treasureChest: "Treasure Chest",
      letterScramble: "Letter Scramble",
      popAndLearn: "Pop & Learn",
      brainBattle: "Brain Battle",
      missingPiece: "Missing Piece",
    };

    const renderGameContent = () => {
      switch (gameType) {
        case "luckySpinner":
          return game.wheelSegments?.map((seg: any, i: number) => (
            <Card key={i} className="p-3 bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ backgroundColor: seg.color || "#8B5CF6" }}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{seg.text}</p>
                  {seg.question && <p className="text-sm text-muted-foreground mt-1">Q: {seg.question}</p>}
                  {seg.answer && <p className="text-sm text-accent mt-1">A: {seg.answer}</p>}
                </div>
              </div>
            </Card>
          ));

        case "mysteryBox":
        case "treasureChest":
          const boxes = game.boxes || game.chests || [];
          return (
            <div className="grid grid-cols-4 gap-2">
              {boxes.map((box: any, i: number) => (
                <Card key={i} className="p-2 text-center bg-gradient-to-br from-primary/20 to-accent/20 hover-elevate cursor-pointer">
                  <div className="font-bold text-lg">{box.number || i + 1}</div>
                  <p className="text-xs text-muted-foreground truncate">{box.question || box.content}</p>
                  <p className="text-xs text-accent mt-1">{box.points || box.reward}</p>
                </Card>
              ))}
            </div>
          );

        case "memoryMatch":
          return game.pairs?.map((pair: any, i: number) => (
            <div key={i} className="flex gap-2">
              <Card className="flex-1 p-3 bg-primary/10 text-center">
                <p className="font-medium">{pair.card1}</p>
              </Card>
              <div className="flex items-center text-muted-foreground">↔</div>
              <Card className="flex-1 p-3 bg-accent/10 text-center">
                <p className="font-medium">{pair.card2}</p>
              </Card>
            </div>
          ));

        case "factOrFib":
          return game.statements?.map((stmt: any, i: number) => (
            <Card key={i} className="p-3 bg-muted/30">
              <div className="flex items-start gap-3">
                <Badge variant={stmt.isTrue ? "default" : "destructive"} className="flex-shrink-0">
                  {stmt.isTrue ? "FACT" : "FIB"}
                </Badge>
                <div>
                  <p className="font-medium">{stmt.statement}</p>
                  {stmt.explanation && <p className="text-sm text-muted-foreground mt-1">{stmt.explanation}</p>}
                </div>
              </div>
            </Card>
          ));

        case "wordHunt":
          return (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Find these {game.words?.length} words in the grid:</p>
              <div className="flex flex-wrap gap-2">
                {game.words?.map((word: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-sm">{word}</Badge>
                ))}
              </div>
              {game.hints?.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium text-sm mb-2">Hints:</p>
                  {game.hints.map((h: any, i: number) => (
                    <p key={i} className="text-sm text-muted-foreground">{h.word}: {h.hint}</p>
                  ))}
                </div>
              )}
            </div>
          );

        case "letterRescue":
          return game.words?.map((item: any, i: number) => (
            <Card key={i} className="p-3 bg-muted/30">
              <p className="font-mono text-lg tracking-widest">{item.word?.split('').map(() => '_ ').join('')}</p>
              <p className="text-sm text-muted-foreground mt-1">Category: {item.category}</p>
              <p className="text-sm text-accent mt-1">Hint: {item.hint}</p>
              <p className="text-xs text-primary mt-2">Answer: {item.word}</p>
            </Card>
          ));

        case "letterScramble":
          return game.scrambles?.map((item: any, i: number) => (
            <Card key={i} className="p-3 bg-muted/30">
              <p className="font-mono text-xl tracking-widest text-center">{item.scrambled}</p>
              <p className="text-sm text-muted-foreground text-center mt-1">{item.hint}</p>
              <p className="text-sm text-accent text-center mt-2">Answer: {item.answer}</p>
            </Card>
          ));

        case "quickCatch":
        case "popAndLearn":
          const items = game.targets || game.balloons || [];
          return (
            <>
              {game.question && <p className="font-medium text-lg mb-3">{game.question}</p>}
              <div className="grid grid-cols-3 gap-2">
                {items.map((item: any, i: number) => (
                  <Card key={i} className={`p-3 text-center ${item.isCorrect ? 'bg-green-500/20 border-green-500' : 'bg-muted/30'}`} style={item.color ? { backgroundColor: item.color + '20' } : {}}>
                    <p className="font-medium">{item.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.points} pts</p>
                  </Card>
                ))}
              </div>
            </>
          );

        case "brainBattle":
          return game.questions?.map((q: any, i: number) => (
            <Card key={i} className="p-3 bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{q.question}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {q.options?.map((opt: string, j: number) => (
                      <Badge key={j} variant={j === q.correctIndex ? "default" : "secondary"} className="text-xs">
                        {opt}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{q.points} pts | {q.timeLimit}s</p>
                </div>
              </div>
            </Card>
          ));

        case "missingPiece":
          return game.sentences?.map((item: any, i: number) => (
            <Card key={i} className="p-3 bg-muted/30">
              <p className="font-medium">{item.sentence}</p>
              <p className="text-sm text-accent mt-1">Answer: {item.answer}</p>
              {item.hint && <p className="text-xs text-muted-foreground mt-1">Hint: {item.hint}</p>}
            </Card>
          ));

        default:
          return game.items?.map((item: any, i: number) => (
            <Card key={i} className="p-3 bg-muted/30">
              <p className="font-medium">{item.question}</p>
              <p className="text-sm text-accent mt-1">Answer: {item.answer}</p>
            </Card>
          ));
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="font-bold text-xl">{game.title}</h3>
          <Badge variant="outline" className="capitalize">{gameTypeLabels[gameType] || game.gameName || gameType}</Badge>
          {game.teamMode && <Badge variant="secondary" className="capitalize">{game.teamMode}</Badge>}
          {game.estimatedTime && <Badge variant="secondary">{game.estimatedTime}</Badge>}
        </div>
        
        {game.learningObjectives?.length > 0 && (
          <div className="bg-primary/10 rounded-lg p-3">
            <p className="font-medium text-sm mb-1">Learning Objectives:</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside">
              {game.learningObjectives.map((obj: string, i: number) => (
                <li key={i}>{obj}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="font-medium mb-2">How to Play:</p>
          <p className="text-muted-foreground whitespace-pre-line">{game.instructions}</p>
        </div>
        
        <div className="grid gap-3 mt-4">
          {renderGameContent()}
        </div>
        
        {game.tips?.length > 0 && (
          <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
            <p className="font-medium text-sm text-amber-600 dark:text-amber-400 mb-1">Teacher Tips:</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside">
              {game.tips.map((tip: string, i: number) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
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
    const hasWatermark = !!data.watermark;

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
                <div className="flex-shrink-0 w-full sm:w-32 relative">
                  {frame.image ? (
                    <>
                      <img 
                        src={frame.image} 
                        alt={`Frame ${frame.frameNumber}`}
                        className="w-full h-auto rounded-lg border shadow-sm"
                        data-testid={`img-frame-${index}`}
                      />
                      <BrightBoardLogo show={true} />
                    </>
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

// Worksheet download buttons component
function WorksheetDownloadButtons({ content, toast }: { content: string; toast: any }) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadAsPDF = async () => {
    setDownloading("pdf");
    try {
      const res = await apiRequest("POST", "/api/worksheet-to-pdf", { content });
      const data = await res.json();
      
      const link = document.createElement("a");
      link.href = data.file;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "Downloaded", description: "PDF file downloaded successfully." });
    } catch (error) {
      toast({ title: "Download failed", description: "Could not create PDF.", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const downloadAsImage = async () => {
    setDownloading("jpeg");
    try {
      const res = await apiRequest("POST", "/api/worksheet-to-image", { content });
      const data = await res.json();
      
      const link = document.createElement("a");
      link.href = data.file;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "Downloaded", description: "Image file downloaded successfully." });
    } catch (error) {
      toast({ title: "Download failed", description: "Could not create image.", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const downloadAsText = () => {
    try {
      const data = JSON.parse(content);
      let text = `${data.title}\n${"=".repeat(data.title.length)}\n\n`;
      text += `Instructions: ${data.instructions}\n\n`;
      
      data.sections?.forEach((section: any, idx: number) => {
        if (section.title) text += `${section.title}\n${"-".repeat(section.title.length)}\n`;
        section.content?.forEach((item: string, i: number) => {
          text += `${i + 1}. ${item}\n`;
        });
        text += "\n";
      });
      
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.title || "worksheet"}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({ title: "Downloaded", description: "Text file downloaded successfully." });
    } catch (error) {
      toast({ title: "Download failed", description: "Could not create text file.", variant: "destructive" });
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={downloadAsPDF} disabled={!!downloading} data-testid="button-download-pdf">
        {downloading === "pdf" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileText className="h-4 w-4 mr-1.5" />}
        PDF
      </Button>
      <Button variant="outline" size="sm" onClick={downloadAsImage} disabled={!!downloading} data-testid="button-download-jpeg">
        {downloading === "jpeg" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-1.5" />}
        JPEG
      </Button>
      <Button variant="outline" size="sm" onClick={downloadAsText} disabled={!!downloading} data-testid="button-download-txt">
        <Download className="h-4 w-4 mr-1.5" />
        Text
      </Button>
    </div>
  );
}

// Worksheet content display
function WorksheetContent({ content }: { content: string }) {
  try {
    const data = JSON.parse(content);
    const sections = data.sections || [];
    const isBlackWhite = data.colorMode === "blackWhite";
    
    return (
      <div className="space-y-4" data-testid="worksheet-content">
        <div className="text-center border-b pb-4">
          <h2 className="text-2xl font-bold">{data.title}</h2>
          <p className="text-muted-foreground mt-1">{data.instructions}</p>
          <div className="flex gap-2 justify-center mt-2">
            <Badge variant={isBlackWhite ? "outline" : "default"} data-testid="badge-color-mode">
              {isBlackWhite ? "Black & White" : "Colored"}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-6">
          {sections.map((section: any, idx: number) => (
            <Card 
              key={idx} 
              className={`p-4 ${isBlackWhite ? "bg-white border-2 border-black" : "bg-gradient-to-r from-muted/50 to-muted/20"}`}
              data-testid={`worksheet-section-${idx}`}
            >
              {section.title && (
                <h3 className={`font-semibold mb-3 ${isBlackWhite ? "text-black" : ""}`}>
                  {section.title}
                </h3>
              )}
              
              <div className="space-y-2">
                {section.content?.map((item: string, i: number) => (
                  <div 
                    key={i} 
                    className={`p-2 rounded ${isBlackWhite ? "border border-black" : "bg-background/50"}`}
                  >
                    {section.type === "fillBlank" ? (
                      <p className="font-medium">
                        {i + 1}. {item.replace(/_+/g, (match: string) => `_${"_".repeat(Math.max(10, match.length))}_`)}
                      </p>
                    ) : section.type === "multipleChoice" ? (
                      <div>
                        <p className="font-medium">{i + 1}. {item}</p>
                      </div>
                    ) : section.type === "writingPrompt" ? (
                      <div>
                        <p className="font-medium">{item}</p>
                        <div className={`mt-2 h-24 rounded ${isBlackWhite ? "border-2 border-dashed border-black" : "border-2 border-dashed border-muted-foreground/30"}`} />
                      </div>
                    ) : section.type === "drawing" ? (
                      <div>
                        <p className="font-medium text-sm mb-2">{item}</p>
                        <div className={`h-32 rounded ${isBlackWhite ? "border-2 border-black" : "border-2 border-dashed border-muted-foreground/30 bg-muted/20"}`} />
                      </div>
                    ) : (
                      <p>{i + 1}. {item}</p>
                    )}
                  </div>
                ))}
              </div>
              
              {section.answers && section.answers.length > 0 && (
                <details className="mt-3">
                  <summary className="text-sm text-muted-foreground cursor-pointer">Answer Key</summary>
                  <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                    {section.answers.map((answer: string, i: number) => (
                      <p key={i}>{i + 1}. {answer}</p>
                    ))}
                  </div>
                </details>
              )}
            </Card>
          ))}
        </div>
      </div>
    );
  } catch {
    return <TextContent content={content} />;
  }
}

function MindmapContent({ content }: { content: string }) {
  try {
    const data = JSON.parse(content);
    return (
      <div className="space-y-4" data-testid="mindmap-content">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-xl" data-testid="mindmap-title">{data.title || "Mind Map"}</h3>
          <div className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5" data-testid="logo-badge-mindmap">
            <img src="/favicon.png" alt="BrightBoard" className="w-3.5 h-3.5 rounded" />
            <span className="text-muted-foreground text-[10px] font-medium">brightboardapp.com</span>
          </div>
        </div>
        <div className="rounded-xl border overflow-hidden shadow-sm">
          <MindmapCanvas data={data} />
        </div>
      </div>
    );
  } catch {
    return <TextContent content={content} />;
  }
}
