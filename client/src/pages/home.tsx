import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { Image, Presentation, FileText, Film, ClipboardList, Network } from "lucide-react";
import { ContentTypeCard } from "@/components/content-type-card";
import { PromptInput } from "@/components/prompt-input";
import { GeneratedContentDisplay } from "@/components/generated-content-display";
import { GenerationProgress } from "@/components/generation-progress";
import { HistorySidebar } from "@/components/history-sidebar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ContentType, GeneratedContent } from "@shared/schema";

const getContentTypes = (t: (key: string) => string) => [
  {
    type: "image" as ContentType,
    icon: Image,
    title: t("contentTypes.image"),
    description: t("contentTypes.imageDesc"),
    color: "bg-chart-4",
  },
  {
    type: "presentation" as ContentType,
    icon: Presentation,
    title: t("contentTypes.presentation"),
    description: t("contentTypes.presentationDesc"),
    color: "bg-chart-5",
  },
  {
    type: "text" as ContentType,
    icon: FileText,
    title: t("contentTypes.text"),
    description: t("contentTypes.textDesc"),
    color: "bg-chart-2",
  },
  {
    type: "storyboard" as ContentType,
    icon: Film,
    title: t("contentTypes.storyboard"),
    description: t("contentTypes.storyboardDesc"),
    color: "bg-primary",
  },
  {
    type: "worksheet" as ContentType,
    icon: ClipboardList,
    title: t("contentTypes.worksheet"),
    description: t("contentTypes.worksheetDesc"),
    color: "bg-chart-1",
  },
  {
    type: "mindmap" as ContentType,
    icon: Network,
    title: t("contentTypes.mindmap"),
    description: t("contentTypes.mindmapDesc"),
    color: "bg-chart-3",
  },
];

export default function Home() {
  const { t } = useTranslation();
  const searchString = useSearch();
  const [selectedType, setSelectedType] = useState<ContentType>("image");
  const [selectedGameType, setSelectedGameType] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<GeneratedContent | null>(null);
  const [lastPrompt, setLastPrompt] = useState<{ prompt: string; gradeLevel?: string; subject?: string; slideCount?: number; videoOptions?: { length?: string; style?: string; quality?: string }; presentationOptions?: { style?: string; layout?: string; imageStyle?: string; imageQuality?: string; transition?: string; transitionDelay?: number; tapToReveal?: boolean }; worksheetOptions?: { colorMode?: string }; referenceImage?: string; imageOptions?: { style?: string; quality?: string; layout?: string }; textOptions?: { style?: string }; activityOptions?: { gameType?: string }; includeLogo?: boolean; mindmapOptions?: { branchCount?: number; layoutStyle?: string; imageStyle?: string; imageQuality?: string; contentStyle?: string; referenceImages?: string[] } } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const contentTypes = getContentTypes(t);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const type = params.get("type");
    const game = params.get("game");
    
    if (type && contentTypes.some(ct => ct.type === type)) {
      setSelectedType(type as ContentType);
    }
    if (game) {
      setSelectedGameType(game);
    }
  }, [searchString]);

  const [jobId, setJobId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const [generationPercent, setGenerationPercent] = useState(0);
  const [queuePosition, setQueuePosition] = useState(0);

  const { data: history = [] } = useQuery<GeneratedContent[]>({
    queryKey: ["/api/content"],
  });

  // Poll job status while generating
  const { data: jobStatus } = useQuery<any>({
    queryKey: ["/api/generate/job", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const res = await fetch(`/api/generate/job/${jobId}`);
      if (!res.ok) throw new Error("Job not found");
      return res.json();
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const d = query.state.data as any;
      if (d?.status === "complete" || d?.status === "error") return false;
      return 1500;
    },
    staleTime: 0,
  });

  // Handle job status changes
  useEffect(() => {
    if (!jobStatus) return;
    setGenerationStep(jobStatus.step || "");
    setGenerationPercent(jobStatus.percent || 0);
    setQueuePosition(jobStatus.queuePosition || 0);

    if (jobStatus.status === "complete") {
      setIsGenerating(false);
      setJobId(null);
      if (jobStatus.limitReached || (jobStatus.error && !jobStatus.result)) {
        toast({
          title: t("home.generationFailed"),
          description: jobStatus.error || t("home.tryAgain"),
          variant: "destructive",
        });
      } else if (jobStatus.result) {
        setGeneratedContent(jobStatus.result.content);
        setSelectedHistoryItem(null);
        queryClient.invalidateQueries({ queryKey: ["/api/content"] });
        toast({ title: t("home.contentCreated"), description: t("home.contentReady") });
      }
    }
    if (jobStatus.status === "error") {
      setIsGenerating(false);
      setJobId(null);
      toast({
        title: t("home.generationFailed"),
        description: jobStatus.error || t("home.tryAgain"),
        variant: "destructive",
      });
    }
  }, [jobStatus]);

  const handleDelete = async (id: number) => {
    await apiRequest("DELETE", `/api/content/${id}`);
    queryClient.invalidateQueries({ queryKey: ["/api/content"] });
    toast({ title: t("home.deleted"), description: t("home.contentRemoved") });
  };

  const startGeneration = async (payload: Record<string, any>) => {
    setIsGenerating(true);
    setGenerationStep("Starting up...");
    setGenerationPercent(0);
    setQueuePosition(0);
    try {
      const res = await apiRequest("POST", "/api/generate", payload);
      const { jobId: newJobId, error } = await res.json();
      if (error) throw new Error(error);
      setJobId(newJobId);
    } catch (err: any) {
      setIsGenerating(false);
      toast({ title: t("home.generationFailed"), description: err.message || t("home.tryAgain"), variant: "destructive" });
    }
  };

  const handleGenerate = (prompt: string, gradeLevel?: string, subject?: string, slideCount?: number, videoOptions?: { length?: string; style?: string; quality?: string }, presentationOptions?: { style?: string; layout?: string; imageStyle?: string; imageQuality?: string; transition?: string; transitionDelay?: number; tapToReveal?: boolean }, referenceImage?: string, worksheetOptions?: { colorMode?: string }, imageOptions?: { style?: string; quality?: string; layout?: string }, textOptions?: { style?: string }, activityOptions?: { gameType?: string }, includeLogo?: boolean, mindmapOptions?: { branchCount?: number; layoutStyle?: string; imageStyle?: string; imageQuality?: string; contentStyle?: string; referenceImages?: string[] }) => {
    const payload = { type: selectedType, prompt, gradeLevel, subject, slideCount, videoOptions, presentationOptions, worksheetOptions, referenceImage, imageOptions, textOptions, activityOptions, includeLogo, mindmapOptions };
    setLastPrompt({ prompt, gradeLevel, subject, slideCount, videoOptions, presentationOptions, worksheetOptions, referenceImage, imageOptions, textOptions, activityOptions, includeLogo, mindmapOptions });
    startGeneration(payload);
  };

  const handleRegenerate = () => {
    if (lastPrompt) startGeneration({ type: selectedType, ...lastPrompt });
  };

  const handleSelectHistory = (item: GeneratedContent) => {
    setSelectedHistoryItem(item);
    setGeneratedContent(item.content);
    setSelectedType(item.type as ContentType);
  };

  const displayContent = selectedHistoryItem?.content || generatedContent;

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-chart-4 to-accent bg-clip-text text-transparent">
              {t("home.whatCreate")}
            </h1>
            <p className="text-muted-foreground">
              {t("home.chooseType")}
            </p>
          </div>

          {/* Content Type Selection - Horizontal scroll on mobile */}
          <div className="overflow-x-auto -mx-6 px-6 pb-2">
            <div className="flex gap-3 min-w-max sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:min-w-0">
              {contentTypes.map((ct) => (
                <ContentTypeCard
                  key={ct.type}
                  icon={ct.icon}
                  title={ct.title}
                  description={ct.description}
                  color={ct.color}
                  isSelected={selectedType === ct.type}
                  onClick={() => {
                    setSelectedType(ct.type);
                    setSelectedHistoryItem(null);
                  }}
                  testId={`card-type-${ct.type}`}
                />
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <PromptInput
            selectedType={selectedType}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            defaultGameType={selectedGameType}
          />

          {/* Live Generation Progress */}
          {isGenerating && (
            <GenerationProgress
              step={generationStep}
              percent={generationPercent}
              queuePosition={queuePosition}
              contentType={selectedType}
            />
          )}

          {/* Generated Content */}
          {!isGenerating && (
            <GeneratedContentDisplay
              type={selectedHistoryItem?.type as ContentType || selectedType}
              content={displayContent}
              isLoading={false}
              onRegenerate={lastPrompt ? handleRegenerate : undefined}
            />
          )}
        </div>
      </div>

      {/* History Sidebar */}
      <div className="w-72 border-l bg-card/50 hidden lg:block">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm">{t("home.recentCreations")}</h2>
        </div>
        <HistorySidebar
          history={history}
          onSelect={handleSelectHistory}
          onDelete={handleDelete}
          selectedId={selectedHistoryItem?.id}
        />
      </div>
    </div>
  );
}
