import { Briefcase, Check, DoorOpen, Lightbulb, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PREFERRED_WORKSPACE_OPTIONS,
  PRIMARY_WORKSPACE_OPTIONS,
  type PreferredWorkspace,
  type PrimaryWorkspace,
} from "@/lib/workspace-focus";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TILE_CLASS: Record<PreferredWorkspace, string> = {
  recruiting: "bg-brand-amethyst/15 text-brand-amethyst",
  prospecting: "bg-brand-sky/15 text-brand-sky",
  both: "bg-[linear-gradient(120deg,hsl(var(--brand-amethyst)),hsl(var(--brand-rose)))] text-white",
};

const ICON: Record<PreferredWorkspace, typeof Briefcase> = {
  recruiting: Briefcase,
  prospecting: DoorOpen,
  both: Sparkles,
};

interface ChooseFocusStepProps {
  value: PreferredWorkspace;
  primaryValue: PrimaryWorkspace;
  onChange: (
    preferredWorkspace: PreferredWorkspace,
    primaryWorkspace: PrimaryWorkspace
  ) => void;
  disabled?: boolean;
}

export function ChooseFocusStep({
  value,
  primaryValue,
  onChange,
  disabled = false,
}: ChooseFocusStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-[26px]">
          What would you like to do first?
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground sm:text-[15px]">
          Tell us your goal — we&apos;ll set up the right workspace.{" "}
          <span className="font-bold text-gs-rose">
            You can turn on more anytime.
          </span>
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3 md:items-stretch">
        {PREFERRED_WORKSPACE_OPTIONS.map((option) => {
          const selected = value === option.id;
          const Icon = ICON[option.id];
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => {
                if (option.id === "both") {
                  onChange("both", primaryValue || "recruiting");
                  return;
                }
                onChange(option.id, option.id);
              }}
              className={cn(
                "relative flex h-full w-full min-w-0 flex-col rounded-2xl border bg-card p-4 text-left transition-all sm:p-5",
                "hover:-translate-y-0.5 hover:border-brand-amethyst/50 hover:shadow-lg",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:pointer-events-none disabled:opacity-50",
                selected
                  ? "border-brand-amethyst shadow-[0_0_0_3px_hsl(var(--brand-amethyst)/0.14)]"
                  : "border-border"
              )}
            >
              <span
                className={cn(
                  "absolute right-3.5 top-3.5 grid h-5 w-5 place-items-center rounded-full border-2 sm:right-4 sm:top-4 sm:h-[22px] sm:w-[22px]",
                  selected
                    ? "border-transparent bg-[linear-gradient(120deg,hsl(var(--brand-amethyst)),hsl(var(--brand-rose)))] text-white"
                    : "border-border text-transparent"
                )}
                aria-hidden
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>

              <div
                className={cn(
                  "mb-3 grid h-11 w-11 shrink-0 place-items-center rounded-[13px] sm:h-12 sm:w-12 sm:rounded-[15px]",
                  TILE_CLASS[option.id]
                )}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>

              <div className="mb-1.5 flex min-w-0 flex-nowrap items-center gap-2 pr-7">
                <h3 className="min-w-0 truncate text-[15px] font-extrabold text-foreground sm:text-base">
                  {option.title}
                </h3>
                {option.badge ? (
                  <span className="shrink-0 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {option.badge}
                  </span>
                ) : null}
              </div>
              <p className="min-w-0 text-[13px] leading-snug text-muted-foreground sm:text-[13.5px] sm:leading-relaxed">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>

      {value === "both" ? (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <label
            htmlFor="both-primary-workspace-select"
            className="mb-2 block text-sm font-bold text-foreground"
          >
            Which workspace should we open first?
          </label>
          <p className="mb-3 text-xs text-muted-foreground">
            You can switch anytime from the header. Default is Recruiting.
          </p>
          <Select
            value={primaryValue}
            disabled={disabled}
            onValueChange={(next) => onChange("both", next as PrimaryWorkspace)}
          >
            <SelectTrigger
              id="both-primary-workspace-select"
              className="h-11 max-w-sm rounded-xl"
            >
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent>
              {PRIMARY_WORKSPACE_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="flex w-full items-start gap-2 rounded-[11px] border border-brand-sky/20 bg-brand-sky/10 px-3.5 py-2.5 text-[13px] text-muted-foreground sm:items-center">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand-sky sm:mt-0" />
        <span>
          New here? Most people start with hiring — you can switch in one click
          anytime.
        </span>
      </div>
    </div>
  );
}
