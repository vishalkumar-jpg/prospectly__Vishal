import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import { Loader } from "@/components/ui/loader";
import { useAuth } from "@/contexts/AuthContext";
import { useCountriesFromUrl } from "@/hooks/useCountriesFromUrl";
import { useWorkspaceHomeDestination } from "@/hooks/useWorkspaceHomeDestination";
import { RecruiterDashboardHero } from "./components/RecruiterDashboardHero";
import { RecruiterDashboardCountryBar } from "./components/RecruiterDashboardCountryBar";
import { HiringOverviewSection } from "./components/HiringOverviewSection";
import { PriorityActionsSection } from "./components/PriorityActionsSection";
import { CandidateFunnelSection } from "./components/CandidateFunnelSection";
import { ActiveJobsSection } from "./components/ActiveJobsSection";
import { RecentActivitySection } from "./components/RecentActivitySection";
import { useRecruiterDashboardSummary } from "./hooks/useRecruiterDashboardSummary";
import { useRecruiterHiringOverview } from "./hooks/useRecruiterHiringOverview";
import { useRecruiterCandidateFunnel } from "./hooks/useRecruiterCandidateFunnel";
import { useRecruiterPayoutsDue } from "./hooks/useRecruiterPayoutsDue";
import { PayoutsDueSection } from "./components/PayoutsDueSection";
import { RecruiterDashboardError } from "./components/RecruiterDashboardError";
import type { DashboardPeriodValue } from "./types";

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { countries, setCountries } = useCountriesFromUrl();
  const [overviewPeriod, setOverviewPeriod] =
    useState<DashboardPeriodValue>("30");
  const [funnelPeriod, setFunnelPeriod] = useState<DashboardPeriodValue>("30");

  const homeDestination = useWorkspaceHomeDestination();
  const canAccessDashboard =
    !homeDestination.isLoading && !homeDestination.hasConfirmedNoPostedJobs;

  useEffect(() => {
    if (!user || homeDestination.isLoading) return;
    if (homeDestination.hasConfirmedNoPostedJobs) {
      navigate(homeDestination.path, { replace: true });
    }
  }, [
    user,
    homeDestination.isLoading,
    homeDestination.hasConfirmedNoPostedJobs,
    homeDestination.path,
    navigate,
  ]);

  const summaryQuery = useRecruiterDashboardSummary(countries);
  const overviewQuery = useRecruiterHiringOverview(countries, overviewPeriod);
  const funnelQuery = useRecruiterCandidateFunnel(countries, funnelPeriod);
  // Section-level loading/error: a payouts failure must not take down the page.
  const payoutsDueQuery = useRecruiterPayoutsDue(countries);

  const userName = useMemo(() => {
    if (!user?.fullName?.trim()) return "there";
    return user.fullName.trim().split(/\s+/)[0] ?? "there";
  }, [user?.fullName]);

  const summary = summaryQuery.data;

  const dashboardLoadFailed =
    (summaryQuery.isError && summaryQuery.data === undefined) ||
    (overviewQuery.isError && overviewQuery.data === undefined) ||
    (funnelQuery.isError && funnelQuery.data === undefined);

  const handleDashboardRetry = () => {
    void Promise.all([
      summaryQuery.refetch(),
      overviewQuery.refetch(),
      funnelQuery.refetch(),
    ]);
  };

  if (!user || homeDestination.isLoading || !canAccessDashboard) {
    return <Loader message="Loading…" fullPage />;
  }

  if (dashboardLoadFailed) {
    return (
      <>
        <SEO title="Recruiter Dashboard" />
        <div className="flex min-h-[50vh] items-center justify-center px-4 py-8">
          <RecruiterDashboardError onRetry={handleDashboardRetry} />
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="Recruiter Dashboard" />
      <div className="min-w-0 space-y-6 px-2 py-4 sm:px-4 md:px-6">
        <RecruiterDashboardHero userName={userName} />
        <RecruiterDashboardCountryBar
          countries={countries}
          onCountriesChange={setCountries}
        />
        <HiringOverviewSection
          data={overviewQuery.data}
          loading={overviewQuery.isInitialLoading}
          refreshing={overviewQuery.isRefreshing}
          period={overviewPeriod}
          onPeriodChange={setOverviewPeriod}
        />
        <div className="grid items-start gap-6 lg:grid-cols-2 [&>*]:min-w-0">
          <div className="flex w-full min-w-0 flex-col gap-6">
            <PriorityActionsSection
              items={summary?.priorityActions.items ?? []}
              waitingCount={summary?.priorityActions.waitingCount ?? 0}
              loading={summaryQuery.isInitialLoading}
              refreshing={summaryQuery.isRefreshing}
            />
            <ActiveJobsSection
              jobs={summary?.activeJobs ?? []}
              loading={summaryQuery.isInitialLoading}
              refreshing={summaryQuery.isRefreshing}
            />
          </div>
          <div className="flex w-full min-w-0 flex-col gap-6">
            <CandidateFunnelSection
              data={funnelQuery.data}
              loading={funnelQuery.isInitialLoading}
              refreshing={funnelQuery.isRefreshing}
              period={funnelPeriod}
              onPeriodChange={setFunnelPeriod}
            />
            <RecentActivitySection
              items={summary?.recentActivity ?? []}
              loading={summaryQuery.isInitialLoading}
              refreshing={summaryQuery.isRefreshing}
            />
            {/* Right column's third card balances the taller left column. */}
            <PayoutsDueSection
              data={payoutsDueQuery.data}
              loading={payoutsDueQuery.isInitialLoading}
              refreshing={payoutsDueQuery.isRefreshing}
              error={payoutsDueQuery.isError && !payoutsDueQuery.data}
              onRetry={() => void payoutsDueQuery.refetch()}
            />
          </div>
        </div>
      </div>
    </>
  );
}
