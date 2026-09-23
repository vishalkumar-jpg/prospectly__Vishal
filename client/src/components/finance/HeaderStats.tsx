import {
  ArrowUpRight,
  RotateCcw,
  Wallet,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { StatItem } from "./StatItem";
import { DISPUTE_STATUS } from "@/types/dispute";
import type { FinancialSummary } from "@/hooks/useFinancialSummary";
import type { Dispute } from "@/types/dispute";
import type { PayoutHistoryResponse } from "@/hooks/useTransactionHistory";
import {
  PAGE_STAT_CARD_THREE_COL_WIDTH_CLASS,
  PAGE_STATS_GRID_THREE_END_CLASS,
} from "@/components/ui/page-stat-card";

const HEADER_STATS_ROW_CLASS = PAGE_STATS_GRID_THREE_END_CLASS;
const HEADER_STAT_CARD_CLASS = PAGE_STAT_CARD_THREE_COL_WIDTH_CLASS;

interface HeaderStatsProps {
  activeTab: string;
  summary: FinancialSummary;
  payoutSummary: PayoutHistoryResponse["summary"];
  allDisputes: Dispute[];
}

export function HeaderStats({
  activeTab,
  summary,
  payoutSummary,
  allDisputes,
}: HeaderStatsProps) {
  if (activeTab === "overview") {
    return (
      <div className={HEADER_STATS_ROW_CLASS}>
        <StatItem
          label="Total Spent"
          value={summary.totalSpent}
          icon={ArrowUpRight}
          isCurrency
          className={HEADER_STAT_CARD_CLASS}
        />
        <StatItem
          label="Total Refunded"
          value={summary.totalRefunded}
          icon={RotateCcw}
          isCurrency
          className={HEADER_STAT_CARD_CLASS}
        />
        <StatItem
          label="Net Earnings"
          value={summary.availableBalance}
          icon={Wallet}
          isCurrency
          className={HEADER_STAT_CARD_CLASS}
        />
      </div>
    );
  }

  if (activeTab === "payouts") {
    return (
      <div className={HEADER_STATS_ROW_CLASS}>
        <StatItem
          label="Gross Earnings"
          value={payoutSummary.totalGrossEarnings}
          icon={DollarSign}
          isCurrency
          className={HEADER_STAT_CARD_CLASS}
        />
        <StatItem
          label="Net Earnings"
          value={payoutSummary.totalNetEarnings}
          icon={Wallet}
          isCurrency
          className={HEADER_STAT_CARD_CLASS}
        />
        <StatItem
          label="Completed / Pending"
          value={`${payoutSummary.completedPayouts} / ${payoutSummary.pendingPayouts}`}
          icon={CheckCircle2}
          className={HEADER_STAT_CARD_CLASS}
        />
      </div>
    );
  }

  if (activeTab === "disputes") {
    const activeDisputes = allDisputes.filter(
      (d) =>
        d.status === DISPUTE_STATUS.PENDING ||
        d.status === DISPUTE_STATUS.UNDER_REVIEW
    ).length;
    const resolvedDisputes = allDisputes.filter(
      (d) => d.status === DISPUTE_STATUS.RESOLVED
    ).length;
    const rejectedDisputes = allDisputes.filter(
      (d) => d.status === DISPUTE_STATUS.REJECTED
    ).length;

    return (
      <div className={HEADER_STATS_ROW_CLASS}>
        <StatItem
          label="Active Disputes"
          value={activeDisputes}
          icon={AlertTriangle}
          className={HEADER_STAT_CARD_CLASS}
        />
        <StatItem
          label="Resolved"
          value={resolvedDisputes}
          icon={CheckCircle2}
          className={HEADER_STAT_CARD_CLASS}
        />
        <StatItem
          label="Rejected"
          value={rejectedDisputes}
          icon={XCircle}
          className={HEADER_STAT_CARD_CLASS}
        />
      </div>
    );
  }

  return null;
}
