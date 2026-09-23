import { Award, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs } from "@/components/ui/tabs";
import { RecruitmentFinancePipelineTabs } from "./recruitment/RecruitmentFinancePipelineTabs";
import { FinanceHero } from "./FinanceHero";
import { useConnectorEarningStats } from "@/hooks/useConnectorEarning";
import { useRequesterSpendingStats } from "@/hooks/useRequesterSpending";
import { ConnectorEarningStats } from "./recruitment/ConnectorEarningStats";
import { RequesterSpendingStats } from "./recruitment/RequesterSpendingStats";
import { ConnectorView } from "./recruitment/ConnectorView";
import { RequesterView } from "./recruitment/RequesterView";
import { CandidateBonusView } from "./recruitment/CandidateBonusView";

export type RecruitmentFinanceView = "connector" | "requester" | "candidate";

export type RecruitmentFinanceMenuVariant = "recruiter" | "connector";

interface RecruitmentFinanceTabProps {
  activeView: RecruitmentFinanceView;
  onViewChange: (view: RecruitmentFinanceView) => void;
  menuVariant: RecruitmentFinanceMenuVariant;
  className?: string;
}

export function RecruitmentFinanceTab({
  activeView,
  onViewChange,
  menuVariant,
  className,
}: RecruitmentFinanceTabProps) {
  const isRecruiterMenu = menuVariant === "recruiter";
  const displayView = isRecruiterMenu ? "requester" : activeView;
  const { stats: connectorStats, loading: connectorStatsLoading } =
    useConnectorEarningStats({ enabled: displayView === "connector" });
  const { stats: requesterStats, loading: requesterStatsLoading } =
    useRequesterSpendingStats({ enabled: displayView === "requester" });

  const heroStats =
    displayView === "connector" ? (
      <ConnectorEarningStats
        totalEarnings={connectorStats.totalEarnings}
        totalEarningsThisMonth={connectorStats.totalEarningsThisMonth}
        totalEarningsLastMonth={connectorStats.totalEarningsLastMonth}
        pendingPayouts={connectorStats.pendingPayouts}
        loading={connectorStatsLoading}
      />
    ) : displayView === "requester" ? (
      <RequesterSpendingStats
        totalSpent={requesterStats.totalSpent}
        upcomingPayments={requesterStats.upcomingPayments}
        spentThisMonth={requesterStats.spentThisMonth}
        loading={requesterStatsLoading}
      />
    ) : null;

  return (
    <div className={cn("space-y-6", className)}>
      <FinanceHero
        heading="Recruitment Finance"
        description={
          isRecruiterMenu
            ? "Track requester spending for your recruitment jobs."
            : "Track connector payouts and candidate bonuses in one place."
        }
        statsClassName="lg:w-[640px]"
        rightSlot={heroStats}
      />

      {!isRecruiterMenu ? (
        <Tabs
          value={activeView}
          onValueChange={(value) => onViewChange(value as RecruitmentFinanceView)}
          className="w-full min-w-0"
        >
          <RecruitmentFinancePipelineTabs
            tabs={[
              {
                value: "connector",
                label: "Connector Earnings",
                icon: Users,
              },
              {
                value: "candidate",
                label: "My Bonuses",
                icon: Award,
              },
            ]}
          />
        </Tabs>
      ) : null}

      {displayView === "connector" ? (
        <ConnectorView isActive={displayView === "connector"} />
      ) : displayView === "requester" ? (
        <RequesterView isActive={displayView === "requester"} />
      ) : (
        <CandidateBonusView isActive={displayView === "candidate"} />
      )}
    </div>
  );
}

export default RecruitmentFinanceTab;
