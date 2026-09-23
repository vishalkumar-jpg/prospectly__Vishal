import { FinancialSummary } from "@/hooks/useFinancialSummary";
import { UnifiedStatCard } from "./UnifiedStatCard";
import { CreditCard, TrendingUp, RotateCcw } from "lucide-react";

interface FinancialSummaryCardsProps {
  summary: FinancialSummary;
}

export function FinancialSummaryCards({ summary }: FinancialSummaryCardsProps) {
  const hasRefunds = summary.totalRefunded > 0;

  return (
    <div
      className={`grid gap-6 ${hasRefunds ? "md:grid-cols-3" : "md:grid-cols-2"}`}
    >
      <UnifiedStatCard
        title="Total Spent"
        value={summary.totalSpent}
        subtitle="On bounties (net of refunds)"
        icon={CreditCard}
        color="orange"
        isCurrency
      />
      {hasRefunds && (
        <UnifiedStatCard
          title="Total Refunded"
          value={summary.totalRefunded}
          subtitle="Returned to you"
          icon={RotateCcw}
          color="blue"
          isCurrency
        />
      )}
      <UnifiedStatCard
        title="Net Earnings"
        value={summary.availableBalance}
        subtitle="From introductions"
        icon={TrendingUp}
        color="green"
        isCurrency
      />
    </div>
  );
}
