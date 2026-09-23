import { PercentProgressBar } from "@/components/ui/percent-progress-bar";
import type {
  GapAnalysisPayload,
  GapDimensionKey,
} from "@/lib/recruitment/gap-analysis.types";
import {
  barFillClass,
  dimensionStatus,
  scoreBreakdownByKey,
  scoreBreakdownFillPercent,
} from "@/lib/recruitment/gap-analysis.utils";

/** The AI-written dimension titles are too long for the 286px rail. */
const SHORT_LABELS: Record<GapDimensionKey, string> = {
  skillsMatch: "Skills",
  experienceMatch: "Experience",
  educationMatch: "Education",
  domainKnowledge: "Domain",
  workEligibility: "Eligibility",
  employmentTypeCompatibility: "Employment type",
};

interface GapAnalysisScoreBreakdownPanelProps {
  data: GapAnalysisPayload;
}

/**
 * Explains how the overall score is composed. Renders nothing when the record
 * was never annotated, so the modal degrades to its previous layout.
 */
export function GapAnalysisScoreBreakdownPanel({
  data,
}: GapAnalysisScoreBreakdownPanelProps) {
  const breakdown = data.scoreBreakdown;
  const byKey = scoreBreakdownByKey(data);
  if (!breakdown || !byKey) return null;

  const topReasons = breakdown.topReasons?.filter(Boolean) ?? [];

  return (
    <div className="mt-3 border-t border-border pt-3 sm:mt-5 sm:pt-4">
      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        How this score adds up
      </p>

      <div className="space-y-2.5">
        {data.dimensions.map((dimension) => {
          const entry = byKey.get(dimension.key);
          if (!entry) return null;

          return (
            <div key={dimension.key}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-muted-foreground">
                  {SHORT_LABELS[dimension.key] || dimension.title}
                </span>
                <span className="shrink-0 font-medium tabular-nums text-foreground">
                  {entry.pointsEarned}/{entry.weight}
                </span>
              </div>
              <PercentProgressBar
                value={scoreBreakdownFillPercent(entry)}
                indicatorClassName={barFillClass(
                  dimensionStatus(dimension, entry)
                )}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-baseline justify-between border-t border-border pt-2.5 text-xs">
        <span className="font-medium text-foreground">Total</span>
        <span className="font-semibold tabular-nums text-foreground">
          {breakdown.totalScore} / 100
        </span>
      </div>

      {breakdown.lostPoints > 0 && topReasons.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Why {breakdown.lostPoints} points were lost
          </p>
          <ul className="space-y-1">
            {topReasons.map((reason) => (
              <li
                key={reason}
                className="flex gap-1.5 text-xs leading-snug text-muted-foreground"
              >
                <span
                  aria-hidden
                  className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40"
                />
                <span className="min-w-0">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
