import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Film, Volume2, Music, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { StoryboardFrame } from "@shared/schema";

interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  storyboardData: {
    title: string;
    description?: string;
    frames: StoryboardFrame[];
  } | null;
}

const voiceOptions = [
  { value: "nova", label: "Nova (Female, Warm)" },
  { value: "alloy", label: "Alloy (Neutral)" },
  { value: "echo", label: "Echo (Male)" },
  { value: "fable", label: "Fable (British)" },
  { value: "onyx", label: "Onyx (Male, Deep)" },
  { value: "shimmer", label: "Shimmer (Female, Expressive)" },
];

export function VideoExportModal({ isOpen, onClose, content, storyboardData }: VideoExportModalProps) {
  const [includeNarration, setIncludeNarration] = useState(true);
  const [includeMusic, setIncludeMusic] = useState(true);
  const [voice, setVoice] = useState("nova");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      toast({
        title: "Creating video...",
        description: includeNarration 
          ? "Generating narration and video. This may take 1-2 minutes." 
          : "Creating video. Please wait.",
      });

      const response = await fetch("/api/storyboard-to-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          includeNarration,
          includeMusic,
          voice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate video");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `brightboard-video-${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Video downloaded!",
        description: "Your MP4 video has been saved.",
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const framesWithImages = storyboardData?.frames.filter(f => f.image) || [];
  const estimatedDuration = framesWithImages.length * 4;
  
  const getImageSrc = (image: string) => {
    if (image.startsWith('data:') || image.startsWith('http')) {
      return image;
    }
    return `data:image/png;base64,${image}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            Export Video
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">Video Preview</h4>
            <div className="grid grid-cols-4 gap-1">
              {framesWithImages.slice(0, 8).map((frame, i) => (
                <img
                  key={i}
                  src={getImageSrc(frame.image!)}
                  alt={`Frame ${i + 1}`}
                  className="w-full h-12 object-cover rounded"
                  data-testid={`img-preview-frame-${i}`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {framesWithImages.length} frames ~ {estimatedDuration} seconds
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="narration" className="text-sm font-medium">
                  Include Narration
                </Label>
              </div>
              <Switch
                id="narration"
                checked={includeNarration}
                onCheckedChange={setIncludeNarration}
                disabled={isExporting}
                data-testid="switch-narration"
              />
            </div>
            <p className="text-xs text-muted-foreground -mt-2 ml-6">
              AI reads dialogue and descriptions aloud
            </p>

            {includeNarration && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="voice" className="text-xs text-muted-foreground">
                  Voice Style
                </Label>
                <Select value={voice} onValueChange={setVoice} disabled={isExporting}>
                  <SelectTrigger id="voice" className="w-full" data-testid="select-voice">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="music" className="text-sm font-medium">
                  Background Music
                </Label>
              </div>
              <Switch
                id="music"
                checked={includeMusic}
                onCheckedChange={setIncludeMusic}
                disabled={isExporting}
                data-testid="switch-music"
              />
            </div>
            <p className="text-xs text-muted-foreground -mt-2 ml-6">
              Soft educational background music
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isExporting} data-testid="button-cancel">
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting} data-testid="button-export-video">
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export MP4
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
