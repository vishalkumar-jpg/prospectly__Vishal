import { Check, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FitSignal } from "@/lib/api/recruitment-candidate-search";

/**
 * Same three-state vocabulary as `CandidateRelevance`: emerald met, amber
 * unknown, neutral-dashed missed. `unknown` is amber and says "unchecked" —
 * red would brand an unindexed résumé as a failed requirement, which is a
 * correctness bug, not a styling preference.
 */
const CHIP_STYLES: Record<FitSignal["state"], string> = {
  met: "border-brand-success/30 bg-brand-success/10 text-brand-success",
  missing:
    "border-dashed border-border bg-background text-muted-foreground line-through decoration-border",
  unknown: "border-brand-warning/30 bg-brand-warning/10 text-brand-warning",
};

const CHIP_BASE =
  "max-w-full gap-0.5 whitespace-nowrap px-2 py-0.5 text-[10.5px] font-normal";

export interface WhyThisPersonCellProps {
  signals: FitSignal[];
  /** Folds to 2 in the 768–1100 layout and on the mobile card (§9.7). */
  maxMet?: number;
  maxMissed?: number;
  className?: string;
}

export function WhyThisPersonCell({
  signals,
  maxMet = 3,
  maxMissed = 2,
  className,
}: WhyThisPersonCellProps) {
  // A visible row must always explain why it is here. Prefer met/unknown skill
  // chips; if the payload has none, still render a placeholder rather than a blank.
  const displaySignals: FitSignal[] =
    signals.length > 0
      ? signals
      : [
          {
            label: "Skills not listed",
            kind: "skill",
            state: "unknown",
            weight: 0,
          },
        ];

  // `unknown` rides with the met chips: it is something we looked for and could
  // not check, so hiding it behind "+N missing" would read as a miss.
  const met = displaySignals.filter((signal) => signal.state !== "missing");
  const missed = displaySignals.filter((signal) => signal.state === "missing");

  const visibleMet = met.slice(0, maxMet);
  const visibleMissed = missed.slice(0, maxMissed);
  const moreMet = met.length - visibleMet.length;
  const moreMissed = missed.length - visibleMissed.length;

  // The cell shows at most three met and two missed chips, so on a wide
  // criteria set most of the answer is behind "+N more". The tooltip carries
  // the whole list — a Why column that hides why is not doing its job.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex max-w-[250px] cursor-default flex-wrap gap-1",
            className
          )}
        >
          {visibleMet.map((signal) => {
            const Icon = signal.state === "met" ? Check : HelpCircle;
            return (
              <Badge
                key={`${signal.kind}-${signal.label}`}
                variant="outline"
                className={cn(CHIP_BASE, CHIP_STYLES[signal.state])}
              >
                <Icon className="h-2.5 w-2.5 shrink-0" aria-hidden />
                <span className="truncate">
                  {signal.label}
                  {signal.state === "unknown" ? " · unchecked" : null}
                </span>
              </Badge>
            );
          })}

          {moreMet > 0 ? (
            <Badge
              variant="outline"
              className={cn(CHIP_BASE, "border-border text-muted-foreground")}
            >
              +{moreMet} more
            </Badge>
          ) : null}

          {visibleMissed.map((signal) => (
            <Badge
              key={`${signal.kind}-${signal.label}`}
              variant="outline"
              className={cn(CHIP_BASE, CHIP_STYLES.missing)}
            >
              <span className="truncate">{signal.label}</span>
            </Badge>
          ))}

          {moreMissed > 0 ? (
            <Badge
              variant="outline"
              className={cn(
                CHIP_BASE,
                "border-dashed border-border text-muted-foreground"
              )}
            >
              +{moreMissed} missing
            </Badge>
          ) : null}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm">
        <ul className="space-y-0.5 text-xs">
          {displaySignals.map((signal) => (
            <li
              key={`tip-${signal.kind}-${signal.label}`}
              className="flex items-center gap-1.5"
            >
              <span aria-hidden>
                {signal.state === "met"
                  ? "\u2713"
                  : signal.state === "unknown"
                    ? "?"
                    : "\u2715"}
              </span>
              <span>{signal.label}</span>
              {signal.state === "unknown" ? (
                <span className="opacity-70">unchecked</span>
              ) : null}
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
