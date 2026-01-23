import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface ContentTypeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  isSelected: boolean;
  onClick: () => void;
  testId: string;
}

export function ContentTypeCard({
  icon: Icon,
  title,
  description,
  color,
  isSelected,
  onClick,
  testId,
}: ContentTypeCardProps) {
  return (
    <Card
      onClick={onClick}
      data-testid={testId}
      className={`
        p-4 cursor-pointer transition-all duration-200 hover-elevate
        ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
      `}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2.5 rounded-lg ${color}`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </Card>
  );
}
