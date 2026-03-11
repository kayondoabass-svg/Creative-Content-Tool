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
import { useTranslation } from "react-i18next";
import type { ContentType } from "@shared/schema";

interface PromptInputProps {
  selectedType: ContentType;
  onGenerate: (prompt: string, gradeLevel?: string, subject?: string, slideCount?: number, videoOptions?: { length?: string; style?: string; quality?: string }, presentationOptions?: { style?: string; layout?: string; imageStyle?: string; imageQuality?: string; transition?: string; transitionDelay?: number; tapToReveal?: boolean }, referenceImage?: string, worksheetOptions?: { colorMode?: string }, imageOptions?: { style?: string; quality?: string; layout?: string }, textOptions?: { style?: string }, activityOptions?: { gameType?: string }, includeLogo?: boolean, mindmapOptions?: { branchCount?: number; layoutStyle?: string; imageStyle?: string; imageQuality?: string; contentStyle?: string }) => void;
  isGenerating: boolean;
  defaultGameType?: string | null;
}

const worksheetColorModes = [
  { value: "colored", key: "home.colored" },
  { value: "blackWhite", key: "home.blackAndWhite" },
];

const videoLengths = [
  { value: "30sec", label: "30 sec" },
  { value: "1min", label: "1 min" },
  { value: "2min", label: "2 min" },
  { value: "3min", label: "3 min" },
  { value: "4min", label: "4 min" },
  { value: "5min", label: "5 min" },
  { value: "10min", label: "10 min" },
  { value: "30min", label: "30 min" },
];

const videoLanguages = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "pt", label: "Portuguese" },
  { value: "zh", label: "Mandarin Chinese" },
  { value: "hi", label: "Hindi" },
  { value: "ar", label: "Arabic" },
  { value: "sw", label: "Swahili" },
  { value: "zu", label: "Zulu" },
  { value: "lg", label: "Luganda" },
  { value: "vi", label: "Vietnamese" },
];

const videoStyles = [
  { value: "animation", key: "home.animation" },
  { value: "reallife", key: "home.realLife" },
];

const videoQualities = [
  { value: "2d", label: "2D", premium: false },
  { value: "3d", label: "3D", premium: false },
  { value: "hd", label: "HD", premium: true },
  { value: "4k", label: "4K", premium: true },
];

const presentationStyles = [
  { value: "textAndImages", key: "home.textAndImages" },
  { value: "imagesOnly", key: "home.imagesOnly" },
  { value: "textOnly", key: "home.textOnly" },
];

const presentationLayouts = [
  { value: "single", key: "home.singleImage" },
  { value: "grid", key: "home.imageGrid" },
];

const presentationImageStyles = [
  { value: "animation", key: "home.animation" },
  { value: "reallife", key: "home.realLife" },
];

const presentationImageQualities = [
  { value: "2d", label: "2D", premium: false },
  { value: "3d", label: "3D", premium: false },
  { value: "hd", label: "HD", premium: true },
  { value: "4k", label: "4K", premium: true },
];

const presentationTransitions = [
  { value: "none", key: "home.none" },
  { value: "fade", key: "home.fade" },
  { value: "slide", key: "home.slide" },
  { value: "zoom", key: "home.zoom" },
  { value: "flip", key: "home.flip" },
];

const gradeLevelKeys = [
  { value: "Pre-K", key: "grades.preschool" },
  { value: "Kindergarten", key: "grades.kindergarten" },
  { value: "1st Grade", key: "grades.grade1" },
  { value: "2nd Grade", key: "grades.grade2" },
  { value: "3rd Grade", key: "grades.grade3" },
  { value: "4th Grade", key: "grades.grade4" },
  { value: "5th Grade", key: "grades.grade5" },
  { value: "6th Grade", key: "grades.grade6" },
  { value: "7th Grade", key: "grades.grade7" },
  { value: "8th Grade", key: "grades.grade8" },
  { value: "High School", key: "grades.high" },
];

const subjectKeys = [
  { value: "Reading", key: "subjects.reading" },
  { value: "Math", key: "subjects.math" },
  { value: "Science", key: "subjects.science" },
  { value: "Social Studies", key: "subjects.social" },
  { value: "Art", key: "subjects.art" },
  { value: "Music", key: "subjects.music" },
  { value: "Physical Education", key: "subjects.pe" },
  { value: "Language Arts", key: "subjects.languageArts" },
  { value: "STEM", key: "subjects.stem" },
  { value: "Life Skills", key: "subjects.lifeSkills" },
];


// Image generation options (for Educational Images)
const imageStyles = [
  { value: "animation", key: "home.animation" },
  { value: "reallife", key: "home.realLife" },
];

const imageQualities = [
  { value: "2d", label: "2D", premium: false },
  { value: "3d", label: "3D", premium: false },
  { value: "hd", label: "HD", premium: true },
  { value: "4k", label: "4K", premium: true },
];

const imageLayouts = [
  { value: "single", key: "home.singleImage" },
  { value: "grid", key: "home.gridFourImages" },
];

const textStyles = [
  { value: "story", key: "home.story" },
  { value: "explanation", key: "home.explanation" },
  { value: "poem", key: "home.poem" },
  { value: "dialogue", key: "home.dialogue" },
];

const gameTypes = [
  { value: "luckySpinner", key: "home.luckySpinner", descKey: "home.spinWheelDesc" },
  { value: "mysteryBox", key: "home.mysteryBox", descKey: "home.mysteryBoxDesc" },
  { value: "memoryMatch", key: "home.memoryMatch", descKey: "home.memoryMatchDesc" },
  { value: "quickCatch", key: "home.quickCatch", descKey: "home.quickCatchDesc" },
  { value: "factOrFib", key: "home.factOrFib", descKey: "home.factOrFibDesc" },
  { value: "wordHunt", key: "home.wordHunt", descKey: "home.wordHuntDesc" },
  { value: "letterRescue", key: "home.letterRescue", descKey: "home.letterRescueDesc" },
  { value: "treasureChest", key: "home.treasureChest", descKey: "home.treasureChestDesc" },
  { value: "letterScramble", key: "home.letterScramble", descKey: "home.letterScrambleDesc" },
  { value: "popAndLearn", key: "home.popAndLearn", descKey: "home.popAndLearnDesc" },
  { value: "brainBattle", key: "home.brainBattle", descKey: "home.brainBattleDesc" },
  { value: "missingPiece", key: "home.missingPiece", descKey: "home.missingPieceDesc" },
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
  videoLanguage: z.string().optional(),
  presentationStyle: z.string().optional(),
  presentationLayout: z.string().optional(),
  presentationImageStyle: z.string().optional(),
  presentationImageQuality: z.string().optional(),
  // Premium features
  presentationTransition: z.string().optional(),
  presentationTransitionDelay: z.string().optional(),
  presentationTapToReveal: z.boolean().optional(),
  worksheetColorMode: z.string().optional(),
  // Mindmap options
  mindmapBranchCount: z.string().optional(),
  mindmapLayoutStyle: z.string().optional(),
  mindmapImageStyle: z.string().optional(),
  mindmapImageQuality: z.string().optional(),
  mindmapContentStyle: z.string().optional(),
  // Logo toggle (applies to all visual content)
  includeLogo: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function PromptInput({ selectedType, onGenerate, isGenerating, defaultGameType }: PromptInputProps) {
  const { t } = useTranslation();
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
      slideCount: isPremium ? "6" : "4",
      // Image options
      imageStyle: "animation",
      imageQuality: isPremium ? "hd" : "2d",
      imageLayout: "single",
      // Text options
      textStyle: "story",
      // Game type options
      gameType: "luckySpinner",
      // Video options
      videoLength: "1min",
      videoStyle: "animation",
      videoQuality: isPremium ? "hd" : "2d",
      videoLanguage: "en",
      presentationStyle: "textAndImages",
      presentationLayout: "single",
      presentationImageStyle: "animation",
      presentationImageQuality: isPremium ? "hd" : "2d",
      presentationTransition: "none",
      presentationTransitionDelay: "0",
      presentationTapToReveal: false,
      worksheetColorMode: "colored",
      // Mindmap options
      mindmapBranchCount: "5",
      mindmapLayoutStyle: "radial",
      mindmapImageStyle: "animation",
      mindmapImageQuality: isPremium ? "hd" : "2d",
      mindmapContentStyle: "imagesAndText",
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

  useEffect(() => {
    if (defaultGameType && selectedType === "activity") {
      form.setValue("gameType", defaultGameType);
    }
  }, [defaultGameType, selectedType, form]);

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
      language: values.videoLanguage,
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
    const mindmapOptions = selectedType === "mindmap" ? {
      branchCount: values.mindmapBranchCount ? parseInt(values.mindmapBranchCount) : 5,
      layoutStyle: values.mindmapLayoutStyle,
      imageStyle: values.mindmapImageStyle,
      imageQuality: values.mindmapImageQuality,
      contentStyle: values.mindmapContentStyle,
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
      values.includeLogo || false,
      mindmapOptions,
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
                        <SelectValue placeholder={t('home.gradeLevel')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {gradeLevelKeys.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {t(level.key)}
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
                        <SelectValue placeholder={t('home.subject')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjectKeys.map((subj) => (
                        <SelectItem key={subj.value} value={subj.value}>
                          {t(subj.key)}
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
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.slideCount')}:</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={3}
                        max={isPremium ? 20 : 4}
                        className="w-[70px]"
                        data-testid="input-slide-count"
                        {...field}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isPremium && val > 4) {
                            field.onChange("4");
                          } else {
                            field.onChange(e.target.value);
                          }
                        }}
                      />
                    </FormControl>
                    {!isPremium && (
                      <a href="/pricing" className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap hover:underline" data-testid="link-slide-limit-upgrade">
                        <Lock className="w-3 h-3" />
                        Max 4 free
                      </a>
                    )}
                  </FormItem>
                )}
              />
            )}

            {selectedType === "mindmap" && (
              <FormField
                control={form.control}
                name="mindmapBranchCount"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">Branches:</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={3}
                        max={8}
                        className="w-[70px]"
                        data-testid="input-branch-count"
                        {...field}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (val > 8) field.onChange("8");
                          else if (val < 3) field.onChange("3");
                          else field.onChange(e.target.value);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {/* Logo toggle for visual content */}
            {(selectedType === "image" || selectedType === "presentation" || selectedType === "storyboard" || selectedType === "worksheet" || selectedType === "mindmap") && (
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
                        <span className="text-sm text-muted-foreground whitespace-nowrap">{t('home.addLogo')}</span>
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
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.style')}:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[110px]" data-testid="select-image-style">
                          <SelectValue placeholder={t('home.style')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {imageStyles.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {t(s.key)}
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
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.quality')}:</FormLabel>
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
                          <SelectValue placeholder={t('home.quality')} />
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
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.layout')}:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[130px]" data-testid="select-image-layout">
                          <SelectValue placeholder={t('home.layout')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {imageLayouts.map((l) => (
                          <SelectItem key={l.value} value={l.value}>
                            {t(l.key)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Mind map options */}
          {selectedType === "mindmap" && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              {/* Layout style — three visual categories */}
              <FormField
                control={form.control}
                name="mindmapLayoutStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2 block">Map Style</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "radial", label: "Radial", desc: "Colorful spider map", icon: "🕷️" },
                        { value: "sketch", label: "Sketch", desc: "Hand-drawn style", icon: "✏️" },
                        { value: "infographic", label: "Infographic", desc: "Bold circles", icon: "🔵" },
                        { value: "pictureboard", label: "Picture Board", desc: "Vocabulary cards for young learners", icon: "🖼️" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          data-testid={`btn-mindmap-layout-${opt.value}`}
                          onClick={() => field.onChange(opt.value)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-center ${
                            field.value === opt.value
                              ? "border-primary bg-primary/10"
                              : "border-muted bg-background hover:border-primary/40"
                          }`}
                        >
                          <span className="text-xl">{opt.icon}</span>
                          <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                          <span className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </FormItem>
                )}
              />

              {/* Image style, quality and content — inline row */}
              <div className="flex flex-wrap items-center gap-3">
                <FormField
                  control={form.control}
                  name="mindmapImageStyle"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.style')}:</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-[125px]" data-testid="select-mindmap-image-style">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="animation">{t('home.animation')}</SelectItem>
                          <SelectItem value="reallife">{t('home.realLife')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mindmapImageQuality"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.quality')}:</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          if (!isPremium && ['hd', '4k'].includes(val)) return;
                          field.onChange(val);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-[105px]" data-testid="select-mindmap-image-quality">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="2d">2D</SelectItem>
                          <SelectItem value="hd">
                            <span className="flex items-center gap-1">HD {!isPremium && <Lock className="w-3 h-3 text-amber-500" />}</span>
                          </SelectItem>
                          <SelectItem value="4k">
                            <span className="flex items-center gap-1">4K {!isPremium && <Lock className="w-3 h-3 text-amber-500" />}</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mindmapContentStyle"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.content')}:</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-[140px]" data-testid="select-mindmap-content-style">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="imagesAndText">{t('home.textAndImages')}</SelectItem>
                          <SelectItem value="textOnly">{t('home.textOnly')}</SelectItem>
                          <SelectItem value="imagesOnly">{t('home.imagesOnly')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
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
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.format')}:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[130px]" data-testid="select-text-style">
                          <SelectValue placeholder={t('home.format')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {textStyles.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {t(s.key)}
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
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.game')}:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[180px]" data-testid="select-game-type">
                          <SelectValue placeholder={t('home.selectGameType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {gameTypes.map((g) => (
                          <SelectItem key={g.value} value={g.value}>
                            <div className="flex flex-col">
                              <span>{t(g.key)}</span>
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
                  {t(gameTypes.find(g => g.value === form.watch("gameType"))?.descKey || '')}
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
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.content')}:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[130px]" data-testid="select-presentation-style">
                          <SelectValue placeholder={t('home.style')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {presentationStyles.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {t(s.key)}
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
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.layout')}:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[120px]" data-testid="select-presentation-layout">
                          <SelectValue placeholder={t('home.layout')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {presentationLayouts.map((l) => (
                          <SelectItem key={l.value} value={l.value}>
                            {t(l.key)}
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
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.photos')}:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[110px]" data-testid="select-presentation-image-style">
                          <SelectValue placeholder={t('home.style')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {presentationImageStyles.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {t(s.key)}
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
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.quality')}:</FormLabel>
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
                          <SelectValue placeholder={t('home.quality')} />
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
                  {t('home.premium')}
                </span>
                <span className="text-sm text-muted-foreground">{t('home.animationOptions')}</span>
                {!isPremium && (
                  <a href="/pricing" className="text-xs text-primary hover:underline ml-2">{t('home.upgrade')}</a>
                )}
              </div>
              
              <FormField
                control={form.control}
                name="presentationTransition"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.transition')}:</FormLabel>
                    <Select onValueChange={field.onChange} value={isPremium ? field.value : "none"} disabled={!isPremium}>
                      <FormControl>
                        <SelectTrigger className="w-[100px]" data-testid="select-presentation-transition">
                          <SelectValue placeholder={t('home.transition')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {presentationTransitions.map((tr) => (
                          <SelectItem key={tr.value} value={tr.value}>
                            {t(tr.key)}
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
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.delay')}:</FormLabel>
                    <Select onValueChange={field.onChange} value={isPremium ? field.value : "0"} disabled={!isPremium}>
                      <FormControl>
                        <SelectTrigger className="w-[70px]" data-testid="select-presentation-delay">
                          <SelectValue placeholder={t('home.delay')} />
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
                        <span className="text-sm text-muted-foreground">{t('home.tapToReveal')}</span>
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
                {t('home.referencePhotoHint')}
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
                    {t('home.uploadPhoto')}
                  </Button>
                )}
                {imagePreview && (
                  <p className="text-xs text-muted-foreground">
                    {t('home.referencePhotoAnalysis')}
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
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.length')}:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[90px]" data-testid="select-video-length">
                          <SelectValue placeholder={t('home.length')} />
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
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.style')}:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[110px]" data-testid="select-video-style">
                          <SelectValue placeholder={t('home.style')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {videoStyles.map((style) => (
                          <SelectItem key={style.value} value={style.value}>
                            {t(style.key)}
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
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.quality')}:</FormLabel>
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
                          <SelectValue placeholder={t('home.quality')} />
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

              <FormField
                control={form.control}
                name="videoLanguage"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.audioSubtitles')}:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[150px]" data-testid="select-video-language">
                          <SelectValue placeholder={t('home.audioSubtitles')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {videoLanguages.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
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
                    <FormLabel className="text-sm text-muted-foreground whitespace-nowrap mb-0">{t('home.colorMode')}:</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[140px]" data-testid="select-worksheet-color">
                          <SelectValue placeholder={t('home.colorMode')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {worksheetColorModes.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {t(mode.key)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <p className="text-xs text-muted-foreground">
                {t('home.worksheetColorHint')}
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
                      placeholder={isListening ? t('home.listening') : t(`home.placeholder${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}` as any)}
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
                    {t('home.recording')}
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
              {t('home.pressToGenerate')} <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> {t('home.toGenerate')}
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
                  {t('home.creating')}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t('home.createContent')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
