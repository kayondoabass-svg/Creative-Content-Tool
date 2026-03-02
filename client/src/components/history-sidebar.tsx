import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Image, Presentation, FileText, Gamepad2, Film, Clock, Trash2, Network } from "lucide-react";
import type { GeneratedContent, ContentType } from "@shared/schema";

interface HistorySidebarProps {
  history: GeneratedContent[];
  onSelect: (item: GeneratedContent) => void;
  onDelete: (id: number) => void;
  selectedId?: number;
}

const typeIcons: Record<ContentType, typeof Image> = {
  image: Image,
  presentation: Presentation,
  text: FileText,
  activity: Gamepad2,
  storyboard: Film,
  worksheet: FileText,
  mindmap: Network,
};

const typeColors: Record<ContentType, string> = {
  image: "bg-chart-4",
  presentation: "bg-chart-5",
  text: "bg-chart-2",
  activity: "bg-chart-3",
  storyboard: "bg-primary",
  worksheet: "bg-chart-1",
  mindmap: "bg-chart-3",
};

export function HistorySidebar({ history, onSelect, onDelete, selectedId }: HistorySidebarProps) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Clock className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No creations yet</p>
        <p className="text-xs text-muted-foreground mt-1">Your generated content will appear here</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-2">
        {history.map((item) => {
          const Icon = typeIcons[item.type as ContentType] || FileText;
          const color = typeColors[item.type as ContentType] || "bg-muted";
          const isSelected = selectedId === item.id;

          return (
            <Card
              key={item.id}
              onClick={() => onSelect(item)}
              className={`
                p-3 cursor-pointer transition-all hover-elevate group
                ${isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
              `}
              data-testid={`history-item-${item.id}`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`p-1.5 rounded-md ${color}`}>
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {item.prompt.slice(0, 50)}...
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  data-testid={`button-delete-${item.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
