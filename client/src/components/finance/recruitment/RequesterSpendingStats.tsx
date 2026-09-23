import {
  PageStatCard,
  PAGE_STAT_CARD_LG_WIDTH_CLASS,
  PAGE_STATS_ROW_END_CLASS,
  PAGE_STATS_SLOT_MIN_HEIGHT_CLASS,
} from "@/components/ui/page-stat-card";
import { ArrowUpRight, Clock } from "lucide-react";

interface RequesterSpendingStatsProps {
  totalSpent: number;
  upcomingPayments: number;
  spentThisMonth: number;
  loading: boolean;
}

export function RequesterSpendingStats({
  totalSpent,
  upcomingPayments,
  loading,
}: RequesterSpendingStatsProps) {
  if (loading) {
    return (
      <div
        className={`${PAGE_STATS_ROW_END_CLASS} ${PAGE_STATS_SLOT_MIN_HEIGHT_CLASS}`}
      >
        {[1, 2].map((i) => (
          <div
            key={i}
            className={`${PAGE_STAT_CARD_LG_WIDTH_CLASS} h-[64px] animate-pulse rounded-2xl border border-border bg-muted`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={PAGE_STATS_ROW_END_CLASS}>
      <PageStatCard
        label="Total Spent"
        icon={ArrowUpRight}
        value={totalSpent}
        prefix="$"
        decimals={2}
        className={PAGE_STAT_CARD_LG_WIDTH_CLASS}
      />
      <PageStatCard
        label="Upcoming Payments"
        icon={Clock}
        value={upcomingPayments}
        prefix="$"
        decimals={2}
        className={PAGE_STAT_CARD_LG_WIDTH_CLASS}
      />
    </div>
  );
}
