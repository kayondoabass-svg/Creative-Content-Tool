import { useEffect, useState } from "react";
import { Loader2, Clock, Zap, CheckCircle, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface GenerationProgressProps {
  step: string;
  percent: number;
  queuePosition: number;
  contentType: string;
}

const typeLabels: Record<string, string> = {
  image: "Image",
  presentation: "Presentation",
  text: "Text",
  activity: "Activity",
  storyboard: "Storyboard",
  worksheet: "Worksheet",
  mindmap: "Mind Map",
};

const estimatedTimes: Record<string, string> = {
  image: "~15 sec",
  presentation: "~45 sec",
  text: "~10 sec",
  activity: "~20 sec",
  storyboard: "~60 sec",
  worksheet: "~20 sec",
  mindmap: "~30 sec",
};

export function GenerationProgress({ step, percent, queuePosition, contentType }: GenerationProgressProps) {
  const [dots, setDots] = useState(".");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const dotTimer = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500);
    const elapsedTimer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { clearInterval(dotTimer); clearInterval(elapsedTimer); };
  }, []);

  const label = typeLabels[contentType] || "Content";
  const eta = estimatedTimes[contentType] || "~30 sec";
  const isQueued = queuePosition > 0;

  return (
    <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-6 space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          {percent >= 100 ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          )}
        </div>
        <div>
          <p className="font-semibold text-sm">
            {isQueued ? `Queued — position #${queuePosition}` : `Generating your ${label}${dots}`}
          </p>
          <p className="text-xs text-muted-foreground">{step}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <Progress value={isQueued ? 0 : percent} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{isQueued ? "Waiting for a free slot..." : `${percent}% complete`}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {isQueued ? "Estimated: " + eta : `${elapsed}s elapsed`}
          </span>
        </div>
      </div>

      {/* Steps */}
      {!isQueued && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Account check", done: percent >= 10 },
            { label: "AI generating", done: percent >= 80 },
            { label: "Saving content", done: percent >= 95 },
          ].map((s) => (
            <div
              key={s.label}
              className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg ${
                s.done
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s.done ? <CheckCircle className="w-3 h-3 flex-shrink-0" /> : <div className="w-3 h-3 rounded-full border border-muted-foreground/30 flex-shrink-0" />}
              {s.label}
            </div>
          ))}
        </div>
      )}

      {/* Queue info */}
      {isQueued && (
        <div className="flex items-center gap-2 text-sm bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg px-3 py-2">
          <Users className="w-4 h-4 flex-shrink-0" />
          <span>High demand right now — you're #{queuePosition} in line. Won't be long!</span>
        </div>
      )}

      {/* Speed badge */}
      {!isQueued && percent < 100 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Zap className="w-3 h-3 text-yellow-500" />
          <span>Powered by AI — estimated {eta} for a {label}</span>
        </div>
      )}
    </div>
  );
}
