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
  remaining?: number;
}

export function ContentTypeCard({
  icon: Icon,
  title,
  description,
  color,
  isSelected,
  onClick,
  testId,
  remaining,
}: ContentTypeCardProps) {
  const showLowCredit = typeof remaining === "number" && remaining <= 1;

  return (
    <Card
      onClick={onClick}
      data-testid={testId}
      className={`
        relative p-3 cursor-pointer transition-all duration-200 hover-elevate
        w-[140px] sm:w-auto flex-shrink-0 sm:flex-shrink
        ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
      `}
    >
      {showLowCredit && (
        <span
          data-testid={`badge-low-credit-${testId}`}
          className="absolute -top-1.5 -right-1.5 z-10 rounded-full bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 leading-none shadow"
        >
          {remaining === 0 ? "0 left" : "1 left"}
        </span>
      )}
      <div className="flex flex-col items-center text-center gap-2 sm:flex-row sm:items-start sm:text-left sm:gap-3">
        <div
          className={`p-2 rounded-lg ${color}`}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-xs sm:text-sm">{title}</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2 hidden sm:block">
            {description}
          </p>
        </div>
      </div>
    </Card>
  );
}
