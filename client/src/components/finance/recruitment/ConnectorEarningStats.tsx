import {
  PageStatCard,
  PAGE_STAT_CARD_LG_WIDTH_CLASS,
  PAGE_STATS_ROW_END_CLASS,
  PAGE_STATS_SLOT_MIN_HEIGHT_CLASS,
} from "@/components/ui/page-stat-card";
import { DollarSign, Clock } from "lucide-react";

interface ConnectorEarningStatsProps {
  totalEarnings: number;
  totalEarningsThisMonth: number;
  totalEarningsLastMonth: number;
  pendingPayouts: number;
  loading: boolean;
}

export function ConnectorEarningStats({
  totalEarnings,
  pendingPayouts,
  loading,
}: ConnectorEarningStatsProps) {
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
        label="Total Earnings"
        icon={DollarSign}
        value={totalEarnings}
        prefix="$"
        decimals={2}
        className={PAGE_STAT_CARD_LG_WIDTH_CLASS}
      />
      <PageStatCard
        label="Pending Payouts"
        icon={Clock}
        value={pendingPayouts}
        prefix="$"
        decimals={2}
        className={PAGE_STAT_CARD_LG_WIDTH_CLASS}
      />
    </div>
  );
}
