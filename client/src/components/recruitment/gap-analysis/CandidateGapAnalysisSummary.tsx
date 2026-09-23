import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2, Target, TrendingDown, TrendingUp } from "lucide-react";
import type {
  GapAnalysisFallbackSignals,
  GapAnalysisPayload,
} from "@/lib/recruitment/gap-analysis.types";
import {
  aggregateMatchedGaps,
  gapChipPillClass,
  matchScoreBadgeClass,
  normalizeChipLabels,
  truncateChipLabels,
} from "@/lib/recruitment/gap-analysis.utils";
import { GapAnalysisDialog } from "@/components/recruitment/gap-analysis/GapAnalysisDialog";

interface CandidateGapAnalysisSummaryProps {
  data?: GapAnalysisPayload | null;
  fallbackSignals?: GapAnalysisFallbackSignals | null;
  legacyMatchScore?: string | number | null;
  variant?: "default" | "embedded";
  analysisStatus?: "pending" | "completed" | "failed" | null;
  analysisNote?: string | null;
  className?: string;
}

function parseLegacyMatchScore(
  value: string | number | null | undefined
): number | null {
  if (value == null) return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ChipRow({
  labels,
  status,
}: {
  labels: string[];
  status: "ok" | "gap";
}) {
  const [expanded, setExpanded] = useState(false);
  const { visible, hiddenCount } = truncateChipLabels(
    labels,
    expanded ? labels.length : 8
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((label) => (
        <span key={label} className={gapChipPillClass(status)}>
          {label}
        </span>
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          +{hiddenCount} more
        </button>
      )}
    </div>
  );
}

function FallbackSignalsSummary({
  signals,
}: {
  signals: GapAnalysisFallbackSignals;
}) {
  const matched = normalizeChipLabels(signals.strengths.filter(Boolean));
  const gaps = normalizeChipLabels(signals.concerns.filter(Boolean));
  if (matched.length === 0 && gaps.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {matched.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-brand-success" />
            <span className="text-xs font-medium text-muted-foreground">
              Matched
            </span>
            <span className="rounded-full bg-brand-success/10 text-brand-success text-[10px] font-semibold px-1.5 py-0.5">
              {matched.length}
            </span>
          </div>
          <ChipRow labels={matched} status="ok" />
        </div>
      )}
      {gaps.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-brand-destructive" />
            <span className="text-xs font-medium text-muted-foreground">
              Gaps
            </span>
            <span className="rounded-full bg-brand-destructive/10 text-brand-destructive text-[10px] font-semibold px-1.5 py-0.5">
              {gaps.length}
            </span>
          </div>
          <ChipRow labels={gaps} status="gap" />
        </div>
      )}
    </div>
  );
}

export function CandidateGapAnalysisSummary({
  data,
  fallbackSignals,
  legacyMatchScore,
  variant = "default",
  analysisStatus,
  analysisNote,
  className,
}: CandidateGapAnalysisSummaryProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const isEmbedded = variant === "embedded";
  const fallbackScore = parseLegacyMatchScore(legacyMatchScore);

  if (analysisStatus === "pending" && !data && !fallbackSignals) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-brand-amethyst/15 bg-brand-amethyst/5 p-4 shadow-sm",
          isEmbedded ? "mb-3" : "mt-4",
          className
        )}
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-amethyst" />
        <p className="text-sm text-muted-foreground">
          Match analysis in progress…
        </p>
      </div>
    );
  }

  if (analysisStatus === "failed" && !data && !fallbackSignals) {
    return (
      <div
        className={cn(
          "rounded-xl border border-brand-destructive/20 bg-brand-destructive/5 p-4 shadow-sm",
          isEmbedded ? "mb-3" : "mt-4",
          className
        )}
      >
        <p className="text-sm text-muted-foreground">
          Match analysis could not be completed.
          {analysisNote ? ` ${analysisNote}` : ""}
        </p>
      </div>
    );
  }

  if (!data && fallbackSignals) {
    return (
      <div
        className={cn(isEmbedded ? "mb-3" : "border-t pt-4 mt-4", className)}
      >
        {!isEmbedded && (
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-foreground">
              Candidate Evaluation
            </h4>
            {fallbackScore != null && (
              <Badge
                variant="outline"
                className={cn(
                  "ml-auto text-xs font-medium",
                  matchScoreBadgeClass(fallbackScore)
                )}
              >
                <Target className="h-3 w-3 mr-1" />
                {Math.round(fallbackScore)}% Match
              </Badge>
            )}
          </div>
        )}
        <FallbackSignalsSummary signals={fallbackSignals} />
      </div>
    );
  }

  if (!data) return null;

  const { matched, gaps } = aggregateMatchedGaps(data.dimensions);
  const scoreFromData = Number.isFinite(data.matchScore)
    ? Math.round(data.matchScore)
    : null;
  const score =
    scoreFromData ?? (fallbackScore != null ? Math.round(fallbackScore) : null);

  return (
    <>
      <div
        className={cn(isEmbedded ? "mb-3" : "border-t pt-4 mt-4", className)}
      >
        {!isEmbedded && (
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-foreground">
              Candidate Evaluation
            </h4>
            {score != null ? (
              <Badge
                variant="outline"
                className={cn(
                  "ml-auto text-xs font-medium",
                  matchScoreBadgeClass(score)
                )}
              >
                <Target className="h-3 w-3 mr-1" />
                {score}% Match
              </Badge>
            ) : null}
          </div>
        )}

        {matched.length > 0 && (
          <div className="mb-2.5">
            <div className="flex items-center gap-1 mb-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-brand-success" />
              <span className="text-xs font-medium text-muted-foreground">
                Matched
              </span>
              <span className="rounded-full bg-brand-success/10 text-brand-success text-[10px] font-semibold px-1.5 py-0.5">
                {matched.length}
              </span>
            </div>
            <ChipRow labels={matched} status="ok" />
          </div>
        )}

        {gaps.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1 mb-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-brand-destructive" />
              <span className="text-xs font-medium text-muted-foreground">
                Gaps
              </span>
              <span className="rounded-full bg-brand-destructive/10 text-brand-destructive text-[10px] font-semibold px-1.5 py-0.5">
                {gaps.length}
              </span>
            </div>
            <ChipRow labels={gaps} status="gap" />
          </div>
        )}

        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className={cn(
            "font-medium text-brand-amethyst hover:underline inline-flex items-center gap-1",
            isEmbedded ? "text-xs" : "text-sm"
          )}
        >
          View full analysis
        </button>
      </div>

      <GapAnalysisDialog
        data={data}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
