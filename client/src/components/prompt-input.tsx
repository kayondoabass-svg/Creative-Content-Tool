import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Sparkles, Loader2, Upload, X, Image as ImageIcon, Lock, Crown, Mic, MicOff, Square } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import type { ContentType } from "@shared/schema";

interface PromptInputProps {
  selectedType: ContentType;
  onGenerate: (prompt: string, gradeLevel?: string, subject?: string, slideCount?: number, videoOptions?: { length?: string; style?: string; quality?: string }, presentationOptions?: { style?: string; layout?: string; imageStyle?: string; imageQuality?: string; transition?: string; transitionDelay?: number; tapToReveal?: boolean }, referenceImage?: string, worksheetOptions?: { colorMode?: string }, imageOptions?: { style?: string; quality?: string; layout?: string }, textOptions?: { style?: string }, activityOptions?: { gameType?: string }, includeLogo?: boolean) => void;
  isGenerating: boolean;
}

const worksheetColorModes = [
  { value: "colored", label: "Colored" },
  { value: "blackWhite", label: "Black & White" },
];

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
  { value: "2d", label: "2D", premium: false },
  { value: "3d", label: "3D", premium: false },
  { value: "hd", label: "HD", premium: true },
  { value: "4k", label: "4K", premium: true },
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

const presentationImageStyles = [
  { value: "animation", label: "Animation" },
  { value: "reallife", label: "Real Life" },
];

const presentationImageQualities = [
  { value: "2d", label: "2D", premium: false },
  { value: "3d", label: "3D", premium: false },
  { value: "hd", label: "HD", premium: true },
  { value: "4k", label: "4K", premium: true },
];

// Premium animation options
const presentationTransitions = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "zoom", label: "Zoom" },
  { value: "flip", label: "Flip" },
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
  activity: "Describe your online game topic... e.g., 'A fun game about multiplication tables for 3rd graders' or 'Animals and their habitats for kindergarten'",
  storyboard: "Describe your animated video concept... e.g., 'A fun animated video teaching the ABC song with dancing letters like Cocomelon style'",
  worksheet: "Describe the worksheet you want to create... e.g., 'A math worksheet with addition problems for 2nd graders' or 'A vocabulary worksheet about animals'",
};

// Image generation options (for Educational Images)
const imageStyles = [
  { value: "animation", label: "Animation" },
  { value: "reallife", label: "Real Life" },
];

const imageQualities = [
  { value: "2d", label: "2D", premium: false },
  { value: "3d", label: "3D", premium: false },
  { value: "hd", label: "HD", premium: true },
  { value: "4k", label: "4K", premium: true },
];

const imageLayouts = [
  { value: "single", label: "Single Image" },
  { value: "grid", label: "Grid (4 images)" },
];

// Text content styles
const textStyles = [
  { value: "story", label: "Story" },
  { value: "explanation", label: "Explanation" },
  { value: "poem", label: "Poem" },
  { value: "dialogue", label: "Dialogue" },
];

// Online game types for teachers
const gameTypes = [
  { value: "luckySpinner", label: "Lucky Spinner", description: "Spin the wheel for random selection" },
  { value: "mysteryBox", label: "Mystery Box", description: "Tap to reveal numbered boxes" },
  { value: "memoryMatch", label: "Memory Match", description: "Flip cards to find matching pairs" },
  { value: "quickCatch", label: "Quick Catch", description: "Tap correct answers as they appear" },
  { value: "factOrFib", label: "Fact or Fib", description: "True or false questions" },
  { value: "wordHunt", label: "Word Hunt", description: "Find hidden words in a grid" },
  { value: "letterRescue", label: "Letter Rescue", description: "Guess letters to reveal the word" },
  { value: "treasureChest", label: "Treasure Chest", description: "Open boxes for surprises" },
  { value: "letterScramble", label: "Letter Scramble", description: "Unscramble jumbled letters" },
  { value: "popAndLearn", label: "Pop & Learn", description: "Pop balloons to answer" },
  { value: "brainBattle", label: "Brain Battle", description: "Quiz with points for teams" },
  { value: "missingPiece", label: "Missing Piece", description: "Fill in the blank" },
];

const formSchema = z.object({
  prompt: z.string().min(1, "Please describe what you want to create").max(2000),
  gradeLevel: z.string().optional(),
  subject: z.string().optional(),
  slideCount: z.string().optional(),
  // Image options
  imageStyle: z.string().optional(),
  imageQuality: z.string().optional(),
  imageLayout: z.string().optional(),
  // Text options
  textStyle: z.string().optional(),
  // Game type options
  gameType: z.string().optional(),
  // Video options
  videoLength: z.string().optional(),
  videoStyle: z.string().optional(),
  videoQuality: z.string().optional(),
  presentationStyle: z.string().optional(),
  presentationLayout: z.string().optional(),
  presentationImageStyle: z.string().optional(),
  presentationImageQuality: z.string().optional(),
  // Premium features
  presentationTransition: z.string().optional(),
  presentationTransitionDelay: z.string().optional(),
  presentationTapToReveal: z.boolean().optional(),
  worksheetColorMode: z.string().optional(),
  // Logo toggle (applies to all visual content)
  includeLogo: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function PromptInput({ selectedType, onGenerate, isGenerating }: PromptInputProps) {
  const { isPremium } = useSubscription();
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevSelectedType = useRef(selectedType);
  
  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    isSupported: speechSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Clear image when switching away from presentation
  if (prevSelectedType.current !== selectedType) {
    prevSelectedType.current = selectedType;
    if (selectedType !== "presentation" && (referenceImage || imagePreview)) {
      setReferenceImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      gradeLevel: "",
      subject: "",
      slideCount: "6",
      // Image options
      imageStyle: "animation",
      imageQuality: isPremium ? "hd" : "2d",
      imageLayout: "single",
      // Text options
      textStyle: "story",
      // Game type options
      gameType: "luckySpinner",
      // Video options
      videoLength: "5min",
      videoStyle: "animation",
      videoQuality: isPremium ? "hd" : "2d",
      presentationStyle: "textAndImages",
      presentationLayout: "single",
      presentationImageStyle: "animation",
      presentationImageQuality: isPremium ? "hd" : "2d",
      presentationTransition: "none",
      presentationTransitionDelay: "0",
      presentationTapToReveal: false,
      worksheetColorMode: "colored",
      // Logo toggle
      includeLogo: false,
    },
  });

  // Update form prompt when voice transcript changes
  useEffect(() => {
    if (transcript) {
      const currentPrompt = form.getValues("prompt");
      const newPrompt = currentPrompt ? `${currentPrompt} ${transcript}` : transcript;
      form.setValue("prompt", newPrompt.trim());
      resetTranscript();
    }
  }, [transcript, form, resetTranscript]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("Image too large. Please use an image under 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setReferenceImage(base64);
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setReferenceImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
      imageStyle: values.presentationImageStyle,
      imageQuality: values.presentationImageQuality,
      transition: values.presentationTransition,
      transitionDelay: values.presentationTransitionDelay ? parseFloat(values.presentationTransitionDelay) : undefined,
      tapToReveal: values.presentationTapToReveal,
    } : undefined;
    const worksheetOptions = selectedType === "worksheet" ? {
      colorMode: values.worksheetColorMode,
    } : undefined;
    const imageOptions = selectedType === "image" ? {
      style: values.imageStyle,
      quality: values.imageQuality,
      layout: values.imageLayout,
    } : undefined;
    const textOptions = selectedType === "text" ? {
      style: values.textStyle,
    } : undefined;
    const activityOptions = selectedType === "activity" ? {
      gameType: values.gameType,
    } : undefined;
    
    onGenerate(
      values.prompt.trim(),
      values.gradeLevel || undefined,
      values.subject || undefined,
      slideCount,
      videoOptions,
      presentationOptions,
      selectedType === "presentation" ? referenceImage || undefined : undefined,
      worksheetOptions,
      imageOptions,
      textOptions,
      activityOptions,
      values.includeLogo || false
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

            {/* Logo toggle for visual content */}
            {(selectedType === "image" || selectedType === "presentation" || selectedType === "storyboard" || selectedType === "worksheet") && (
              <FormField
                control={form.control}
                name="includeLogo"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div 
                          className={`relative w-10 h-5 rounded-full transition-colors ${field.value ? 'bg-primary' : 'bg-muted'}`}
                          onClick={() => field.onChange(!field.value)}
                          data-testid="toggle-include-logo"
                        >
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${field.value ? 'translate-x-5' : ''}`} />
                        </div>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">Add Logo</span>
                      </label>
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Image options */}
          {selectedType === "image" && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FormField
                control={form.control}
                name="imageStyle"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">Style:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[110px]" data-testid="select-image-style">
                          <SelectValue placeholder="Style" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {imageStyles.map((s) => (
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
                name="imageQuality"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">Quality:</FormLabel>
                    <Select 
                      onValueChange={(val) => {
                        const option = imageQualities.find(q => q.value === val);
                        if (!isPremium && option?.premium) return;
                        field.onChange(val);
                      }} 
                      value={!isPremium && imageQualities.find(q => q.value === field.value)?.premium ? "2d" : field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-[100px]" data-testid="select-image-quality">
                          <SelectValue placeholder="Quality" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {imageQualities.map((q) => (
                          <SelectItem 
                            key={q.value} 
                            value={q.value}
                            disabled={q.premium && !isPremium}
                          >
                            {q.label} {q.premium && !isPremium && <Lock className="w-3 h-3 inline ml-1" />}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageLayout"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">Layout:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[130px]" data-testid="select-image-layout">
                          <SelectValue placeholder="Layout" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {imageLayouts.map((l) => (
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

          {/* Text content options */}
          {selectedType === "text" && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FormField
                control={form.control}
                name="textStyle"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">Format:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[130px]" data-testid="select-text-style">
                          <SelectValue placeholder="Format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {textStyles.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Online Game Type options */}
          {selectedType === "activity" && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FormField
                control={form.control}
                name="gameType"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">Game:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[180px]" data-testid="select-game-type">
                          <SelectValue placeholder="Select Game Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {gameTypes.map((g) => (
                          <SelectItem key={g.value} value={g.value}>
                            <div className="flex flex-col">
                              <span>{g.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              {form.watch("gameType") && (
                <span className="text-xs text-muted-foreground">
                  {gameTypes.find(g => g.value === form.watch("gameType"))?.description}
                </span>
              )}
            </div>
          )}

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

              <FormField
                control={form.control}
                name="presentationImageStyle"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">Photos:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[110px]" data-testid="select-presentation-image-style">
                          <SelectValue placeholder="Style" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {presentationImageStyles.map((s) => (
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
                name="presentationImageQuality"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">Quality:</FormLabel>
                    <Select 
                      onValueChange={(val) => {
                        const option = presentationImageQualities.find(q => q.value === val);
                        if (!isPremium && option?.premium) return;
                        field.onChange(val);
                      }} 
                      value={!isPremium && presentationImageQualities.find(q => q.value === field.value)?.premium ? "2d" : field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-[100px]" data-testid="select-presentation-image-quality">
                          <SelectValue placeholder="Quality" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {presentationImageQualities.map((q) => (
                          <SelectItem 
                            key={q.value} 
                            value={q.value}
                            disabled={q.premium && !isPremium}
                          >
                            {q.label} {q.premium && !isPremium && <Lock className="w-3 h-3 inline ml-1" />}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Premium animation options for presentations */}
          {selectedType === "presentation" && (
            <div className={`flex flex-wrap items-center gap-3 p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg ${!isPremium ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                  {!isPremium && <Lock className="w-3 h-3" />}
                  <Crown className="w-3 h-3" />
                  PREMIUM
                </span>
                <span className="text-sm text-muted-foreground">Animation Options</span>
                {!isPremium && (
                  <a href="/pricing" className="text-xs text-primary hover:underline ml-2">Upgrade</a>
                )}
              </div>
              
              <FormField
                control={form.control}
                name="presentationTransition"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">Transition:</FormLabel>
                    <Select onValueChange={field.onChange} value={isPremium ? field.value : "none"} disabled={!isPremium}>
                      <FormControl>
                        <SelectTrigger className="w-[100px]" data-testid="select-presentation-transition">
                          <SelectValue placeholder="Transition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {presentationTransitions.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="presentationTransitionDelay"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">Delay:</FormLabel>
                    <Select onValueChange={field.onChange} value={isPremium ? field.value : "0"} disabled={!isPremium}>
                      <FormControl>
                        <SelectTrigger className="w-[70px]" data-testid="select-presentation-delay">
                          <SelectValue placeholder="Delay" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">0s</SelectItem>
                        <SelectItem value="0.5">0.5s</SelectItem>
                        <SelectItem value="1">1s</SelectItem>
                        <SelectItem value="2">2s</SelectItem>
                        <SelectItem value="3">3s</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="presentationTapToReveal"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <label className={`flex items-center gap-2 ${isPremium ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        <input
                          type="checkbox"
                          checked={isPremium ? (field.value || false) : false}
                          onChange={field.onChange}
                          disabled={!isPremium}
                          className="w-4 h-4 rounded border-muted-foreground"
                          data-testid="checkbox-tap-to-reveal"
                        />
                        <span className="text-sm text-muted-foreground">Tap to Reveal</span>
                      </label>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Reference image upload for presentations */}
          {selectedType === "presentation" && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-2">
                <ImageIcon className="h-4 w-4 inline mr-1" />
                Optional: Upload a photo of your lesson to use as reference
              </p>
              <div className="flex items-start gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  data-testid="input-reference-image"
                />
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img 
                      src={imagePreview} 
                      alt="Reference" 
                      className="w-24 h-24 object-cover rounded-lg border"
                      data-testid="img-reference-preview"
                    />
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                      onClick={clearImage}
                      data-testid="button-clear-image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-reference"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>
                )}
                {imagePreview && (
                  <p className="text-xs text-muted-foreground">
                    The AI will analyze this image and create a presentation based on its content and style.
                  </p>
                )}
              </div>
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
                    <Select 
                      onValueChange={(val) => {
                        const option = videoQualities.find(q => q.value === val);
                        if (!isPremium && option?.premium) return;
                        field.onChange(val);
                      }} 
                      value={!isPremium && videoQualities.find(q => q.value === field.value)?.premium ? "2d" : field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-[100px]" data-testid="select-video-quality">
                          <SelectValue placeholder="Quality" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {videoQualities.map((qual) => (
                          <SelectItem 
                            key={qual.value} 
                            value={qual.value}
                            disabled={qual.premium && !isPremium}
                          >
                            {qual.label} {qual.premium && !isPremium && <Lock className="w-3 h-3 inline ml-1" />}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          )}

          {selectedType === "worksheet" && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FormField
                control={form.control}
                name="worksheetColorMode"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">Color Mode:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[140px]" data-testid="select-worksheet-color">
                          <SelectValue placeholder="Color Mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {worksheetColorModes.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Choose colored for screen viewing or black & white for printing
              </p>
            </div>
          )}

          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <div className="relative">
                  <FormControl>
                    <Textarea
                      placeholder={isListening ? "Listening... speak now" : placeholders[selectedType]}
                      className="min-h-[100px] text-base resize-none pr-12"
                      onKeyDown={handleKeyDown}
                      data-testid="input-prompt"
                      {...field}
                      value={isListening && interimTranscript ? `${field.value} ${interimTranscript}` : field.value}
                    />
                  </FormControl>
                  {speechSupported && (
                    <Button
                      type="button"
                      variant={isListening ? "destructive" : "outline"}
                      size="icon"
                      className="absolute right-2 top-2"
                      onClick={isListening ? stopListening : startListening}
                      disabled={isGenerating}
                      data-testid="button-voice-record"
                    >
                      {isListening ? (
                        <Square className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                {isListening && (
                  <p className="text-sm text-primary animate-pulse flex items-center gap-2 mt-2" data-testid="text-recording-status">
                    <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                    Recording... Click the stop button or speak to add to your prompt
                  </p>
                )}
                {speechError && (
                  <p className="text-sm text-destructive mt-2" data-testid="text-speech-error">{speechError}</p>
                )}
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between gap-4 flex-wrap">
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
