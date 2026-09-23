import { utcDayjs } from "utils/dayjs";
import type { DashboardPeriod } from "../recruiter-dashboard.constants";

export type DashboardPeriodWindow = {
  period: DashboardPeriod;
  now: Date;
  periodStart: Date | null;
  previousStart: Date | null;
  previousEnd: Date | null;
  comparisonStart: Date;
  /** When true, previous metrics are cumulative totals before comparisonStart. */
  isAllTimeSnapshot: boolean;
};

export function resolveDashboardPeriod(
  period: DashboardPeriod
): DashboardPeriodWindow {
  const now = utcDayjs();

  if (period === "all") {
    const comparisonStart = now.subtract(30, "day").startOf("day");
    return {
      period,
      now: now.toDate(),
      periodStart: null,
      previousStart: null,
      previousEnd: comparisonStart.toDate(),
      comparisonStart: comparisonStart.toDate(),
      isAllTimeSnapshot: true,
    };
  }

  if (period === "ytd") {
    const periodStart = now.startOf("year");
    const previousStart = periodStart.subtract(1, "year");
    const previousEnd = now.subtract(1, "year");
    return {
      period,
      now: now.toDate(),
      periodStart: periodStart.toDate(),
      previousStart: previousStart.toDate(),
      previousEnd: previousEnd.toDate(),
      comparisonStart: periodStart.toDate(),
      isAllTimeSnapshot: false,
    };
  }

  const days = Number(period);
  const periodStart = now.subtract(days, "day").startOf("day");
  const previousStart = periodStart.subtract(days, "day");
  return {
    period,
    now: now.toDate(),
    periodStart: periodStart.toDate(),
    previousStart: previousStart.toDate(),
    previousEnd: periodStart.toDate(),
    comparisonStart: periodStart.toDate(),
    isAllTimeSnapshot: false,
  };
}
