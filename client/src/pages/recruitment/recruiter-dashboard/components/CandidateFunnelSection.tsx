import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PeriodSelect } from "./PeriodSelect";
import { CandidateFunnelSkeleton } from "./DashboardSkeletons";
import { FUNNEL_STAGES } from "./candidate-funnel.constants";
import { CandidateFunnelRows } from "./CandidateFunnelRows";
import { formatFunnelPercent } from "../utils/formatFunnelPercent";
import { DASHBOARD_FILTER_WIDTH_CLASS } from "./dashboardFilter.styles";
import { DASHBOARD_CARD_PADDING_X_CLASS } from "./dashboardCard.styles";
import type {
  DashboardPeriodValue,
  RecruiterCandidateFunnelResponse,
} from "../types";

type CandidateFunnelSectionProps = {
  data?: RecruiterCandidateFunnelResponse;
  loading: boolean;
  refreshing?: boolean;
  period: DashboardPeriodValue;
  onPeriodChange: (period: DashboardPeriodValue) => void;
};

export function CandidateFunnelSection({
  data,
  loading,
  refreshing = false,
  period,
  onPeriodChange,
}: CandidateFunnelSectionProps) {
  const applied = data?.applied ?? 0;
  const rejected = data?.rejected ?? 0;
  const rejectedPctLabel = formatFunnelPercent(rejected, applied);
  const hasFunnelData = applied > 0;

  return (
    <Card className="w-full self-start border-border/70 shadow-sm">
      <CardHeader
        className={cn(
          "flex flex-col items-stretch gap-2 space-y-0 pb-3 sm:flex-row sm:items-center sm:justify-between",
          DASHBOARD_CARD_PADDING_X_CLASS
        )}
      >
        <div className="min-w-0">
          <CardTitle className="text-sm font-bold leading-tight text-foreground">
            Candidate Pipeline
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Where every referred candidate sits right now
          </p>
        </div>
        <div className="self-end sm:self-auto">
          <PeriodSelect
            value={period}
            onChange={onPeriodChange}
            className={DASHBOARD_FILTER_WIDTH_CLASS}
          />
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "space-y-4 transition-opacity",
          DASHBOARD_CARD_PADDING_X_CLASS,
          refreshing && "opacity-60"
        )}
      >
        {loading ? (
          <CandidateFunnelSkeleton />
        ) : !hasFunnelData ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
              {FUNNEL_STAGES.map((stage, index) => (
                <div
                  key={stage.key}
                  className="flex items-center gap-1 sm:gap-1.5"
                >
                  <span className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {stage.label}
                  </span>
                  {index < FUNNEL_STAGES.length - 1 ? (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                  ) : null}
                </div>
              ))}
            </div>
            <p className="max-w-sm text-center text-sm text-muted-foreground">
              No candidate activity in this period yet. Funnel metrics will
              appear once candidates apply and move through your pipeline.
            </p>
          </div>
        ) : (
          <>
            {data ? (
              <CandidateFunnelRows data={data} applied={applied} />
            ) : null}
            <div className="flex items-center justify-between border-t border-border/70 pt-3 text-sm">
              <span className="text-muted-foreground">Rejected</span>
              <span className="font-semibold text-foreground">
                {rejected} ({rejectedPctLabel}%)
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
