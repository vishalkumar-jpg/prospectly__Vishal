import {
  AlertTriangle,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
  XCircle,
} from "lucide-react";
import { GapAnalysisScoreRing } from "@/assets/recruitment/gap-analysis-score-ring";
import { GapAnalysisScoreBreakdownPanel } from "./GapAnalysisScoreBreakdownPanel";
import type {
  GapAnalysisPayload,
  GapChip,
} from "@/lib/recruitment/gap-analysis.types";
import {
  badgeStatusClass,
  gapStatusLabel,
  scoreStatus,
} from "@/lib/recruitment/gap-analysis.utils";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/utils/dateFormatter";

const VERDICT_ICONS: Record<GapChip["status"], typeof CheckCircle2> = {
  ok: CheckCircle2,
  partial: AlertTriangle,
  gap: XCircle,
};

interface GapAnalysisRailProps {
  data: GapAnalysisPayload;
}

export function GapAnalysisRail({ data }: GapAnalysisRailProps) {
  const { candidate } = data;

  // Derived from the score rather than the stored verdict so the banner can
  // never contradict the ring directly above it.
  const verdictStatus = scoreStatus(data.matchScore);
  const VerdictIcon = VERDICT_ICONS[verdictStatus];

  const quickFacts = [
    candidate.experienceSummary
      ? {
          icon: Briefcase,
          label: "Experience",
          value: candidate.experienceSummary,
        }
      : null,
    candidate.location
      ? { icon: MapPin, label: "Location", value: candidate.location }
      : null,
    candidate.company
      ? {
          icon: Building2,
          label: "Current employer",
          value: candidate.company,
        }
      : null,
    candidate.processedAt
      ? {
          icon: Clock,
          label: "Processed at",
          value: formatDateTime(candidate.processedAt),
        }
      : null,
  ].filter(Boolean) as Array<{
    icon: typeof Briefcase;
    label: string;
    value: string;
  }>;

  // The rail owns its own scroll on desktop: the breakdown panel below can
  // exceed the viewport, and the parent grid does not scroll this column.
  return (
    <aside className="flex w-full min-w-0 flex-col border-b border-border bg-card px-4 py-4 text-foreground max-sm:pb-3 sm:px-6 sm:py-5 md:min-h-0 md:overflow-y-auto md:overscroll-contain md:border-b-0 md:border-r">
      <div className="flex w-full flex-col items-center gap-2">
        <GapAnalysisScoreRing
          score={data.matchScore}
          size="default"
          className="my-0 sm:my-4"
        />

        <div
          className={cn(
            "flex w-full max-w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/60 px-3 py-2 text-center text-xs font-medium break-words sm:py-2.5",
            badgeStatusClass(verdictStatus)
          )}
        >
          <VerdictIcon className="h-3.5 w-3.5 shrink-0" />
          {gapStatusLabel(verdictStatus)}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-3 sm:mt-5 sm:flex sm:flex-col sm:gap-3 sm:pt-4">
        {quickFacts.map((fact) => {
          const Icon = fact.icon;
          return (
            <div
              key={fact.label}
              className="flex min-w-0 items-center gap-2.5 text-xs max-sm:rounded-lg max-sm:border max-sm:border-border max-sm:bg-muted/30 max-sm:p-2.5"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted max-sm:bg-background">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
              <span className="min-w-0 flex-1 leading-snug text-muted-foreground">
                {fact.label}
                <span className="mt-0.5 block break-words font-medium text-foreground">
                  {fact.value}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <GapAnalysisScoreBreakdownPanel data={data} />
    </aside>
  );
}
