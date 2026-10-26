import { useState } from "react";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import type { GeneratedContent } from "@shared/schema";

export const LOGO_POSITIONS = [
  { value: "top-left", label: "Top left" },
  { value: "top-center", label: "Top center" },
  { value: "top-right", label: "Top right" },
  { value: "center-left", label: "Center left" },
  { value: "center", label: "Center" },
  { value: "center-right", label: "Center right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
] as const;

export type LogoPosition = typeof LOGO_POSITIONS[number]["value"];

interface LogoAdjustmentEditorProps {
  contentId: number;
  content: string;
  onSaved: (record: GeneratedContent) => void;
  onCancel: () => void;
}

export function LogoAdjustmentEditor({ contentId, content, onSaved, onCancel }: LogoAdjustmentEditorProps) {
  let options: Record<string, unknown> = {};
  try {
    options = JSON.parse(content)?.options || {};
  } catch {
    // The editor remains usable with the contract defaults if old content is malformed.
  }

  const positionValue = options.resolvedLogoPosition || options.logoPosition;
  const initialPosition = LOGO_POSITIONS.some((item) => item.value === positionValue)
    ? positionValue as LogoPosition
    : "top-right";
  const [position, setPosition] = useState<LogoPosition>(initialPosition);
  const [width, setWidth] = useState(Number(options.logoWidthPercent ?? 20));
  const [margin, setMargin] = useState(Number(options.logoMarginPercent ?? 4));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const saveChanges = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest("POST", `/api/content/${contentId}/logo`, {
        logoPosition: position,
        logoWidthPercent: width,
        logoMarginPercent: margin,
      });
      onSaved(await response.json() as GeneratedContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save logo changes. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-4 rounded-xl border border-primary/20 bg-primary/[0.035] p-4" aria-label="Adjust saved logo">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-sm">Adjust logo</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Free recomposition — no new generation or charge. Sources expire 24 hours after creation.
          </p>
        </div>
        <span className="text-[11px] text-muted-foreground sm:pt-0.5">Changes apply when you save</span>
      </div>

      <fieldset disabled={busy} className="mt-4 space-y-4 disabled:opacity-60">
        <legend className="sr-only">Logo placement and size</legend>
        <div>
          <p className="text-xs font-medium mb-2">Position</p>
          <div className="grid grid-cols-3 gap-1.5 max-w-sm" role="group" aria-label="Logo position">
            {LOGO_POSITIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={position === item.value}
                onClick={() => setPosition(item.value)}
                className={`min-h-9 rounded-md border px-2 text-xs transition-colors ${
                  position === item.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:max-w-xl">
          <label className="block">
            <span className="flex justify-between text-xs font-medium mb-2">
              <span>Logo width</span><span className="text-muted-foreground">{width}%</span>
            </span>
            <input
              type="range"
              min={5}
              max={40}
              step={1}
              value={width}
              onChange={(event) => setWidth(Number(event.target.value))}
              className="w-full accent-primary"
            />
            <span className="flex justify-between text-[10px] text-muted-foreground"><span>5%</span><span>40%</span></span>
          </label>
          <label className="block">
            <span className="flex justify-between text-xs font-medium mb-2">
              <span>Edge margin</span><span className="text-muted-foreground">{margin}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={15}
              step={1}
              value={margin}
              onChange={(event) => setMargin(Number(event.target.value))}
              className="w-full accent-primary"
            />
            <span className="flex justify-between text-[10px] text-muted-foreground"><span>0%</span><span>15%</span></span>
          </label>
        </div>
      </fieldset>
      <p className="mt-3 text-xs text-muted-foreground">
        {(() => { try { return JSON.parse(content)?.options?.layout === "grid"; } catch { return false; } })()
          ? "These settings apply to all four images. " : ""}
        Private source limits: 48MB per design and 128MB per account. Oldest editable sources are removed first if the account limit is reached; finished designs stay available until their original expiry.
      </p>

      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          <RotateCcw className="mr-1.5 h-4 w-4" /> Cancel
        </Button>
        <Button size="sm" onClick={saveChanges} disabled={busy} data-testid="button-save-logo">
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
          {busy ? "Saving…" : "Save logo changes"}
        </Button>
      </div>
    </section>
  );
}
