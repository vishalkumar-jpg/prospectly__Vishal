import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getMatchScoreBadgeClass } from "@/lib/recruitment/match-score-colors";
import type { FitResult } from "@/lib/api/recruitment-candidate-search";

export interface MatchScoreCellProps {
  /** Null only when no criterion is applied — the parent hides the column. */
  fit: FitResult | null;
  className?: string;
}

export function MatchScoreCell({ fit, className }: MatchScoreCellProps) {
  if (!fit) return null;

  // Name-only hits carry a display chip but no scoreable criteria — hide 0%.
  if (fit.criteriaCount === 0 && fit.signals.length > 0) return null;

  const percent = Math.round(fit.percent);

  return (
    <div className={cn("min-w-[72px] leading-tight", className)}>
      <Badge
        className={cn(
          "border text-xs tabular-nums",
          getMatchScoreBadgeClass(percent)
        )}
        role="img"
        aria-label={`Match ${percent} percent`}
      >
        {percent}%
      </Badge>
      {fit.criteriaCount > 0 ? (
        <span className="mt-1 block text-[10.5px] tabular-nums text-muted-foreground">
          {fit.metCount} of {fit.criteriaCount} criteria
        </span>
      ) : null}
    </div>
  );
}
