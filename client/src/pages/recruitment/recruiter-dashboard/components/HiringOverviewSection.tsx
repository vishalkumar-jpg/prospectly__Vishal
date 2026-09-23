import {
  Briefcase,
  CheckCircle2,
  Clock,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/ui/innovative";
import { cn } from "@/lib/utils";
import { MetricChangeBadge } from "./MetricChangeBadge";
import { PeriodSelect } from "./PeriodSelect";
import { HiringOverviewCardSkeleton } from "./DashboardSkeletons";
import { DASHBOARD_CARD_PADDING_X_CLASS } from "./dashboardCard.styles";
import { DASHBOARD_FILTER_COMPACT_WIDTH_CLASS } from "./dashboardFilter.styles";
import type {
  DashboardPeriodValue,
  RecruiterHiringOverviewResponse,
} from "../types";

type HiringOverviewSectionProps = {
  data?: RecruiterHiringOverviewResponse;
  loading: boolean;
  refreshing?: boolean;
  period: DashboardPeriodValue;
  onPeriodChange: (period: DashboardPeriodValue) => void;
};

type StatConfig = {
  key: keyof RecruiterHiringOverviewResponse;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  iconClass: string;
  invertColors?: boolean;
  showDaysLabel?: boolean;
  showTarget?: boolean;
};

const STATS: StatConfig[] = [
  {
    key: "openRoles",
    label: "Open Roles",
    subtitle: "Currently hiring",
    icon: Briefcase,
    iconClass: "bg-brand-rose/10 text-brand-rose",
  },
  {
    key: "closedRoles",
    label: "Closed Roles",
    subtitle: "Successfully filled",
    icon: CheckCircle2,
    iconClass: "bg-brand-success/10 text-brand-success",
  },
  {
    key: "totalCandidates",
    label: "Total Candidates",
    subtitle: "Across all jobs",
    icon: Users,
    iconClass: "bg-brand-amethyst/10 text-brand-amethyst",
  },
  {
    key: "avgTimeToFillDays",
    label: "Avg. Time to Fill",
    subtitle: "",
    icon: Clock,
    iconClass: "bg-brand-warning/10 text-brand-warning",
    invertColors: true,
    showDaysLabel: true,
    showTarget: true,
  },
];

function isAvgTimeMetric(
  metric: RecruiterHiringOverviewResponse[keyof RecruiterHiringOverviewResponse]
): metric is RecruiterHiringOverviewResponse["avgTimeToFillDays"] {
  return "targetDays" in metric;
}

export function HiringOverviewSection({
  data,
  loading,
  refreshing = false,
  period,
  onPeriodChange,
}: HiringOverviewSectionProps) {
  return (
    <section className="space-y-3">
      <div
        className={cn(
          DASHBOARD_CARD_PADDING_X_CLASS,
          "flex flex-row items-center justify-between gap-3 sm:px-0"
        )}
      >
        <h2 className="text-sm font-semibold text-foreground">
          Hiring Overview
        </h2>
        <PeriodSelect
          value={period}
          onChange={onPeriodChange}
          className={DASHBOARD_FILTER_COMPACT_WIDTH_CLASS}
        />
      </div>
      <div
        className={cn(
          "grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-2 sm:gap-4 lg:grid-cols-4",
          refreshing && "opacity-60"
        )}
      >
        {loading
          ? STATS.map((stat) => <HiringOverviewCardSkeleton key={stat.key} />)
          : STATS.map((stat) => {
              const metric = data?.[stat.key];
              const Icon = stat.icon;
              return (
                <Card key={stat.key} className="border-border/70 shadow-sm">
                  <CardContent className="flex h-full flex-col px-3 py-4 sm:p-4">
                    <div className="flex items-start gap-3 pb-4">
                      <div
                        className={cn(
                          "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                          stat.iconClass
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {stat.label}
                        </p>
                        {stat.showDaysLabel ? (
                          <div className="mt-0.5">
                            <p className="text-2xl font-extrabold leading-none tracking-tight text-foreground">
                              {metric ? (
                                <>
                                  <AnimatedCounter
                                    value={metric.value}
                                    decimals={0}
                                  />{" "}
                                  Days
                                </>
                              ) : (
                                "—"
                              )}
                            </p>
                            {stat.showTarget &&
                            metric &&
                            isAvgTimeMetric(metric) ? (
                              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                <span>Target</span>
                                <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground">
                                  {metric.targetDays ?? 20} days
                                </span>
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <>
                            <p className="mt-0.5 text-2xl font-extrabold leading-none tracking-tight text-foreground">
                              {metric ? (
                                <AnimatedCounter
                                  value={metric.value}
                                  decimals={0}
                                />
                              ) : (
                                "—"
                              )}
                            </p>
                            {stat.subtitle ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {stat.subtitle}
                              </p>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                    {metric ? (
                      <div className="border-t border-border/70 pt-3">
                        <MetricChangeBadge
                          metric={metric}
                          invertColors={stat.invertColors}
                        />
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
      </div>
    </section>
  );
}
