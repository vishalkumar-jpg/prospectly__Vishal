import { useState, useEffect, useMemo, useRef } from "react";
import SEO from "@/components/SEO";
import { Tabs } from "@/components/ui/tabs";
import { PipelineTabs } from "@/components/pipeline/PipelineTabs";
import { InboxTab } from "@/components/introduction/InboxTab";
import { PipelineTab as PipelineTabComponent } from "@/components/introduction/PipelineTab";
import { ActivityTab } from "@/components/introduction/ActivityTab";
import { UnfulfilledTab } from "@/components/introduction/UnfulfilledTab";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Archive,
  Clock,
  DollarSign,
  GitBranch,
  Inbox,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { PageHeaderSection } from "@/components/ui/page-header";
import {
  PageStatCard,
  PAGE_STATS_GRID_FOUR_CLASS,
} from "@/components/ui/page-stat-card";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useIntroductionEmailLinkParams } from "@/hooks/useIntroductionEmailDeepLink";
import { useRouteTab } from "@/hooks/useRouteTab";
import { useRouteSearch } from "@/hooks/useRouteSearch";
import { INCOMING_REQUESTS_TABS, TAB_ROUTE_BASES } from "@/lib/tab-routes";

type ConnectorPipelineTabKey = (typeof INCOMING_REQUESTS_TABS)[number];

interface PipelineStats {
  inbox: {
    total: number;
    pending: number;
  };
  pipeline: {
    active: number;
    archived: number;
    unfulfilled: number;
  };
  potentialEarnings: number;
  successRate: number;
}

const EMPTY_CONNECTOR_PIPELINE_STATS: PipelineStats = {
  inbox: { total: 0, pending: 0 },
  pipeline: { active: 0, archived: 0, unfulfilled: 0 },
  potentialEarnings: 0,
  successRate: 0,
};

export default function IntroductionPipeline() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useRouteTab<ConnectorPipelineTabKey>({
    basePath: TAB_ROUTE_BASES.incomingRequests,
    allowedTabs: INCOMING_REQUESTS_TABS,
    defaultTab: "inbox",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inboxRefreshTrigger, setInboxRefreshTrigger] = useState(0);
  const { search: searchInput, setSearch: setSearchInput } = useRouteSearch();
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const queryClient = useQueryClient();
  const { emailLinkParams, clearEmailLinkParams } =
    useIntroductionEmailLinkParams();

  useEffect(() => {
    if (!emailLinkParams) {
      return;
    }
    if (emailLinkParams.action === "feedback") {
      setActiveTab("pipeline");
    } else if (emailLinkParams.action === "review") {
      setActiveTab("inbox");
    }
  }, [emailLinkParams, setActiveTab]);

  const statsQueryParams = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      statsContext: activeTab as ConnectorPipelineTabKey,
    }),
    [debouncedSearch, activeTab]
  );

  const lastSuccessfulStatsRef = useRef<PipelineStats | null>(null);

  const {
    data: statsData,
    error: statsError,
    isPending: statsPending,
  } = useQuery<PipelineStats>({
    queryKey: [
      "/api/introduction-requests/introduction-pipeline/stats",
      statsQueryParams,
      { userId: user?.id },
    ],
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (statsData) {
      lastSuccessfulStatsRef.current = statsData;
    }
  }, [statsData]);

  const resolvedStats =
    statsData ??
    lastSuccessfulStatsRef.current ??
    EMPTY_CONNECTOR_PIPELINE_STATS;
  const hasSuccessfulStatsEver =
    statsData != null || lastSuccessfulStatsRef.current != null;
  const statsLoadError =
    !!statsError && !hasSuccessfulStatsEver && !statsPending;

  // Track previous tab with a ref to avoid unnecessary refreshes without triggering loops
  const previousTabRef = useRef<string | null>(null);

  // Refetch data when tab changes
  useEffect(() => {
    const currentTab = activeTab;
    const previousTab = previousTabRef.current;

    // Update the ref immediately
    previousTabRef.current = currentTab;

    // Skip if this is the initial mount or same tab
    if (previousTab === null || previousTab === currentTab) {
      return;
    }

    queryClient.invalidateQueries({
      queryKey: ["/api/introduction-requests/introduction-pipeline/stats"],
    });

    // Invalidate queries based on active tab
    // We don't need to manually trigger inbox refresh here because the component
    // will mount and fetch data automatically when the tab becomes active.
    if (activeTab === "pipeline") {
      queryClient.invalidateQueries({
        queryKey: ["/api/introduction-requests/connector/pipeline"],
      });
    } else if (activeTab === "archive") {
      queryClient.invalidateQueries({
        queryKey: ["/api/introduction-requests/introduction-pipeline/archive"],
      });
    } else if (activeTab === "unfulfilled") {
      queryClient.invalidateQueries({
        queryKey: ["/api/introduction-requests/connector/unfulfilled"],
      });
    }
  }, [activeTab, queryClient]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refetch all relevant queries and wait for completion
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ["/api/introduction-requests/introduction-pipeline/stats"],
        }),
        queryClient.refetchQueries({
          queryKey: ["/api/introduction-requests/connector/pipeline"],
        }),
        queryClient.refetchQueries({
          queryKey: [
            "/api/introduction-requests/introduction-pipeline/archive",
          ],
        }),
        queryClient.refetchQueries({
          queryKey: ["/api/introduction-requests/connector/unfulfilled"],
        }),
      ]);
      // Trigger InboxTab refresh (uses manual fetch, not React Query)
      setInboxRefreshTrigger((prev) => prev + 1);
      toast({
        title: "Refreshed",
        description: "Introduction requests data has been updated.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Refresh failed",
        description: "Could not refresh introduction requests data.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const inboxCount = resolvedStats.inbox?.total || 0;
  const pendingCount = resolvedStats.inbox?.pending || 0;
  const activeCount = resolvedStats.pipeline?.active || 0;
  const archiveCount = resolvedStats.pipeline?.archived || 0;
  const unfulfilledCount = resolvedStats.pipeline?.unfulfilled || 0;
  const potentialEarnings = resolvedStats.potentialEarnings || 0;
  const successRate = resolvedStats.successRate || 0;

  // Dynamic stats based on actual data from API
  const stats = {
    inboxCount: inboxCount,
    pendingRequests: pendingCount,
    activeIntroductions: activeCount,
    completedIntroductions: archiveCount,
    earningsPotential: potentialEarnings,
    successRate,
  };

  return (
    <div className="min-w-0 w-full max-w-full">
      <SEO
        title="Incoming Requests | Prospectly"
        description="Earn money by making introductions for others"
      />
      <div className="min-w-0 space-y-6 px-2 py-4 sm:px-4 md:px-6">
        <PageHeaderSection
          title="Incoming Requests — earn by introducing people."
          description="Review introduction requests and earn referral payouts for the connections you make."
          statsClassName="lg:w-[640px]"
          stats={
            <>
              {statsError && hasSuccessfulStatsEver ? (
                <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground lg:justify-end">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    Stats could not refresh; showing last loaded values.
                  </span>
                </div>
              ) : null}
              {statsLoadError ? (
                <div
                  className="flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                  <span>Could not load pipeline stats.</span>
                </div>
              ) : statsPending && !hasSuccessfulStatsEver ? (
                <div className={PAGE_STATS_GRID_FOUR_CLASS}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[116px] animate-pulse rounded-2xl border border-border bg-muted"
                    />
                  ))}
                </div>
              ) : (
                <div className={PAGE_STATS_GRID_FOUR_CLASS}>
                  {[
                    {
                      key: "pending",
                      label: "Pending",
                      icon: Clock,
                      value: stats.pendingRequests,
                    },
                    {
                      key: "active",
                      label: "Active",
                      icon: GitBranch,
                      value: stats.activeIntroductions,
                    },
                    {
                      key: "earnings",
                      label: "Earnings",
                      icon: DollarSign,
                      value: stats.earningsPotential,
                      prefix: "$",
                    },
                    {
                      key: "success",
                      label: "Success",
                      icon: TrendingUp,
                      value: stats.successRate,
                      suffix: "%",
                    },
                  ].map(({ key, label, icon, value, prefix, suffix }) => (
                    <PageStatCard
                      key={key}
                      label={label}
                      icon={icon}
                      value={value}
                      prefix={prefix}
                      suffix={suffix}
                    />
                  ))}
                </div>
              )}
            </>
          }
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <PipelineTabs
            tabs={[
              {
                value: "inbox",
                label: "Inbox",
                icon: Inbox,
                badge: statsLoadError ? undefined : stats.inboxCount,
                color: "blue",
              },
              {
                value: "pipeline",
                label: "Pipeline",
                icon: GitBranch,
                badge: statsLoadError ? undefined : stats.activeIntroductions,
                color: "purple",
              },
              {
                value: "archive",
                label: "Archive",
                icon: Archive,
                badge: statsLoadError
                  ? undefined
                  : stats.completedIntroductions,
                color: "emerald",
              },
              {
                value: "unfulfilled",
                label: "Unfulfilled",
                icon: XCircle,
                badge:
                  statsLoadError || unfulfilledCount <= 0
                    ? undefined
                    : unfulfilledCount,
                color: "red",
              },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
            filterContainerId="pipeline-filter-container"
            showFilter={activeTab === "pipeline"}
            showSearch
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder="Search meetings, prospects, requesters…"
          />

          <div className="mt-4">
            {activeTab === "inbox" ? (
              <InboxTab
                refreshTrigger={inboxRefreshTrigger}
                search={debouncedSearch}
                emailLinkParams={
                  emailLinkParams?.action === "feedback"
                    ? null
                    : emailLinkParams
                }
                onEmailLinkHandled={clearEmailLinkParams}
              />
            ) : null}

            {activeTab === "pipeline" ? (
              <div className="flex min-h-0 flex-col overflow-hidden lg:h-[calc(100vh-18rem)] lg:max-h-[720px]">
                <PipelineTabComponent
                  search={debouncedSearch}
                  onSwitchToArchive={() => setActiveTab("archive")}
                  emailLinkParams={emailLinkParams}
                  onEmailLinkHandled={clearEmailLinkParams}
                />
              </div>
            ) : null}

            {activeTab === "archive" ? (
              <ActivityTab
                showOnlyCompleted={true}
                search={debouncedSearch}
                emailLinkParams={
                  emailLinkParams?.action === "feedback" ||
                  emailLinkParams?.action === "review"
                    ? null
                    : emailLinkParams
                }
                onEmailLinkHandled={clearEmailLinkParams}
              />
            ) : null}

            {activeTab === "unfulfilled" ? (
              <UnfulfilledTab search={debouncedSearch} />
            ) : null}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
