import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image, Presentation, FileText, Gamepad2, Film, ClipboardList } from "lucide-react";
import { ContentTypeCard } from "@/components/content-type-card";
import { PromptInput } from "@/components/prompt-input";
import { GeneratedContentDisplay } from "@/components/generated-content-display";
import { HistorySidebar } from "@/components/history-sidebar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ContentType, GeneratedContent } from "@shared/schema";

const contentTypes = [
  {
    type: "image" as ContentType,
    icon: Image,
    title: "Educational Images",
    description: "Create colorful illustrations, diagrams, and visual aids for your lessons",
    color: "bg-chart-4",
  },
  {
    type: "presentation" as ContentType,
    icon: Presentation,
    title: "Presentations",
    description: "Generate engaging slide decks with structured content and speaker notes",
    color: "bg-chart-5",
  },
  {
    type: "text" as ContentType,
    icon: FileText,
    title: "Educational Text",
    description: "Create stories, worksheets, explanations, and learning materials",
    color: "bg-chart-2",
  },
  {
    type: "activity" as ContentType,
    icon: Gamepad2,
    title: "Activities & Games",
    description: "Design interactive quizzes, matching games, and learning activities",
    color: "bg-chart-3",
  },
  {
    type: "storyboard" as ContentType,
    icon: Film,
    title: "Video Planning",
    description: "Plan and script animated videos with scenes, dialogue, and visual frames",
    color: "bg-primary",
  },
  {
    type: "worksheet" as ContentType,
    icon: ClipboardList,
    title: "Worksheets",
    description: "Generate printable worksheets with questions, fill-in-the-blanks, and activities",
    color: "bg-chart-1",
  },
];

export default function Home() {
  const [selectedType, setSelectedType] = useState<ContentType>("image");
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<GeneratedContent | null>(null);
  const [lastPrompt, setLastPrompt] = useState<{ prompt: string; gradeLevel?: string; subject?: string; slideCount?: number; videoOptions?: { length?: string; style?: string; quality?: string }; presentationOptions?: { style?: string; layout?: string }; worksheetOptions?: { colorMode?: string }; referenceImage?: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: history = [] } = useQuery<GeneratedContent[]>({
    queryKey: ["/api/content"],
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { type: ContentType; prompt: string; gradeLevel?: string; subject?: string; slideCount?: number; videoOptions?: { length?: string; style?: string; quality?: string }; presentationOptions?: { style?: string; layout?: string }; worksheetOptions?: { colorMode?: string }; referenceImage?: string }) => {
      const res = await apiRequest("POST", "/api/generate", data);
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      setSelectedHistoryItem(null);
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      toast({
        title: "Content created!",
        description: "Your educational content is ready to use.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/content/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      toast({
        title: "Deleted",
        description: "Content removed from history.",
      });
    },
  });

  const handleGenerate = (prompt: string, gradeLevel?: string, subject?: string, slideCount?: number, videoOptions?: { length?: string; style?: string; quality?: string }, presentationOptions?: { style?: string; layout?: string }, referenceImage?: string, worksheetOptions?: { colorMode?: string }) => {
    setLastPrompt({ prompt, gradeLevel, subject, slideCount, videoOptions, presentationOptions, worksheetOptions, referenceImage });
    generateMutation.mutate({ type: selectedType, prompt, gradeLevel, subject, slideCount, videoOptions, presentationOptions, worksheetOptions, referenceImage });
  };

  const handleRegenerate = () => {
    if (lastPrompt) {
      generateMutation.mutate({ type: selectedType, ...lastPrompt });
    }
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
              What would you like to create?
            </h1>
            <p className="text-muted-foreground">
              Choose a content type and describe what you need. AI will create it for you in seconds.
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
            isGenerating={generateMutation.isPending}
          />

          {/* Generated Content */}
          <GeneratedContentDisplay
            type={selectedHistoryItem?.type as ContentType || selectedType}
            content={displayContent}
            isLoading={generateMutation.isPending}
            onRegenerate={lastPrompt ? handleRegenerate : undefined}
          />
        </div>
      </div>

      {/* History Sidebar */}
      <div className="w-72 border-l bg-card/50 hidden lg:block">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm">Recent Creations</h2>
        </div>
        <HistorySidebar
          history={history}
          onSelect={handleSelectHistory}
          onDelete={(id) => deleteMutation.mutate(id)}
          selectedId={selectedHistoryItem?.id}
        />
      </div>
    </div>
  );
}
