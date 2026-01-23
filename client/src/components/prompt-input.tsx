import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Sparkles, Loader2 } from "lucide-react";
import type { ContentType } from "@shared/schema";

interface PromptInputProps {
  selectedType: ContentType;
  onGenerate: (prompt: string, gradeLevel?: string, subject?: string, slideCount?: number, videoOptions?: { length?: string; style?: string; quality?: string }, presentationOptions?: { style?: string; layout?: string }) => void;
  isGenerating: boolean;
}

const videoLengths = [
  { value: "1min", label: "1 min" },
  { value: "5min", label: "5 min" },
  { value: "10min", label: "10 min" },
  { value: "30min", label: "30 min" },
];

const videoStyles = [
  { value: "animation", label: "Animation" },
  { value: "reallife", label: "Real Life" },
];

const videoQualities = [
  { value: "2d", label: "2D" },
  { value: "3d", label: "3D" },
  { value: "hd", label: "HD" },
  { value: "4k", label: "4K" },
];

const presentationStyles = [
  { value: "textAndImages", label: "Text + Images" },
  { value: "imagesOnly", label: "Images Only" },
  { value: "textOnly", label: "Text Only" },
];

const presentationLayouts = [
  { value: "single", label: "Single Image" },
  { value: "grid", label: "Image Grid" },
];

const gradeLevels = [
  "Pre-K",
  "Kindergarten",
  "1st Grade",
  "2nd Grade",
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "High School",
];

const subjects = [
  "Reading",
  "Math",
  "Science",
  "Social Studies",
  "Art",
  "Music",
  "Physical Education",
  "Language Arts",
  "STEM",
  "Life Skills",
];

const placeholders: Record<ContentType, string> = {
  image: "Describe the educational image you want to create... e.g., 'A colorful illustration showing the water cycle with friendly cartoon clouds and raindrops'",
  presentation: "Describe your presentation topic... e.g., 'An engaging presentation about dinosaurs for 2nd graders, including fun facts and interactive questions'",
  text: "Describe the educational content you need... e.g., 'A short story about sharing and friendship for pre-K students with simple vocabulary'",
  activity: "Describe the learning activity or game... e.g., 'A matching game to help 1st graders learn sight words with pictures'",
  storyboard: "Describe your animated video concept... e.g., 'A fun animated video teaching the ABC song with dancing letters like Cocomelon style'",
};

const formSchema = z.object({
  prompt: z.string().min(1, "Please describe what you want to create").max(2000),
  gradeLevel: z.string().optional(),
  subject: z.string().optional(),
  slideCount: z.string().optional(),
  videoLength: z.string().optional(),
  videoStyle: z.string().optional(),
  videoQuality: z.string().optional(),
  presentationStyle: z.string().optional(),
  presentationLayout: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function PromptInput({ selectedType, onGenerate, isGenerating }: PromptInputProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      gradeLevel: "",
      subject: "",
      slideCount: "6",
      videoLength: "5min",
      videoStyle: "animation",
      videoQuality: "hd",
      presentationStyle: "textAndImages",
      presentationLayout: "single",
    },
  });

  const onSubmit = (values: FormValues) => {
    const slideCount = values.slideCount ? parseInt(values.slideCount) : undefined;
    const videoOptions = selectedType === "storyboard" ? {
      length: values.videoLength,
      style: values.videoStyle,
      quality: values.videoQuality,
    } : undefined;
    const presentationOptions = selectedType === "presentation" ? {
      style: values.presentationStyle,
      layout: values.presentationLayout,
    } : undefined;
    
    onGenerate(
      values.prompt.trim(),
      values.gradeLevel || undefined,
      values.subject || undefined,
      slideCount,
      videoOptions,
      presentationOptions
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.metaKey && !isGenerating) {
      form.handleSubmit(onSubmit)();
    }
  };

  return (
    <Card className="p-4 sm:p-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <FormField
              control={form.control}
              name="gradeLevel"
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-[130px]" data-testid="select-grade-level">
                        <SelectValue placeholder="Grade Level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {gradeLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-[130px]" data-testid="select-subject">
                        <SelectValue placeholder="Subject" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects.map((subj) => (
                        <SelectItem key={subj} value={subj}>
                          {subj}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {selectedType === "presentation" && (
              <FormField
                control={form.control}
                name="slideCount"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">Slides:</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={3}
                        max={20}
                        className="w-[70px]"
                        data-testid="input-slide-count"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </div>

          {selectedType === "presentation" && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <FormField
                control={form.control}
                name="presentationStyle"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">Content:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[130px]" data-testid="select-presentation-style">
                          <SelectValue placeholder="Style" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {presentationStyles.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="presentationLayout"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">Layout:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[120px]" data-testid="select-presentation-layout">
                          <SelectValue placeholder="Layout" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {presentationLayouts.map((l) => (
                          <SelectItem key={l.value} value={l.value}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          )}

          {selectedType === "storyboard" && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <FormField
                control={form.control}
                name="videoLength"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">Length:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[90px]" data-testid="select-video-length">
                          <SelectValue placeholder="Length" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {videoLengths.map((len) => (
                          <SelectItem key={len.value} value={len.value}>
                            {len.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="videoStyle"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">Style:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[110px]" data-testid="select-video-style">
                          <SelectValue placeholder="Style" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {videoStyles.map((style) => (
                          <SelectItem key={style.value} value={style.value}>
                            {style.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="videoQuality"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">Quality:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[80px]" data-testid="select-video-quality">
                          <SelectValue placeholder="Quality" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {videoQualities.map((qual) => (
                          <SelectItem key={qual.value} value={qual.value}>
                            {qual.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          )}

          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder={placeholders[selectedType]}
                    className="min-h-[100px] text-base resize-none"
                    onKeyDown={handleKeyDown}
                    data-testid="input-prompt"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground hidden sm:block">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> to generate
            </p>
            <Button
              type="submit"
              disabled={isGenerating || !form.watch("prompt").trim()}
              className="gap-2 ml-auto"
              data-testid="button-generate"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Create Content
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
