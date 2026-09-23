import { useState, useEffect, useMemo, useRef } from "react";
import SEO from "@/components/SEO";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PipelineTabs } from "@/components/pipeline/PipelineTabs";
import { RequestPipelineTab } from "@/components/introduction/RequestPipelineTab";
import { CompletedRequestsTab } from "@/components/introduction/CompletedRequestsTab";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Archive,
  DollarSign,
  GitBranch,
  Inbox,
  TrendingUp,
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
import {
  MY_PROSPECTS_TABS,
  MY_PROSPECTS_TAB_TO_SLUG,
  TAB_ROUTE_BASES,
} from "@/lib/tab-routes";

type ProspectPipelineTab = "active" | "completed";

type RequesterPipelineStats = {
  pendingRequests: number;
  activeRequests: number;
  completedRequests: number;
  totalRequests: number;
  totalAllRequests: number;
  businessValue: number;
  responseRate: number;
};

const EMPTY_REQUESTER_STATS: RequesterPipelineStats = {
  pendingRequests: 0,
  activeRequests: 0,
  completedRequests: 0,
  totalRequests: 0,
  totalAllRequests: 0,
  businessValue: 0,
  responseRate: 0,
};

export default function DealIntroPipeline() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, handleTabChange] = useRouteTab<ProspectPipelineTab>({
    basePath: TAB_ROUTE_BASES.myProspects,
    allowedTabs: ["active", "completed"],
    defaultTab: "active",
    slugToTab: MY_PROSPECTS_TABS,
    tabToSlug: MY_PROSPECTS_TAB_TO_SLUG,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { search: searchInput, setSearch: setSearchInput } = useRouteSearch();
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const queryClient = useQueryClient();
  const { emailLinkParams, clearEmailLinkParams } =
    useIntroductionEmailLinkParams();

  const normalizedTab: ProspectPipelineTab =
    activeTab === "completed" ? "completed" : "active";

  const statsQueryParams = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      statsContext: normalizedTab,
    }),
    [debouncedSearch, normalizedTab]
  );

  useEffect(() => {
    if (
      emailLinkParams?.action === "acknowledge" ||
      emailLinkParams?.action === "republish" ||
      emailLinkParams?.action === "marketplace"
    ) {
      handleTabChange("active");
    }
  }, [emailLinkParams, handleTabChange]);

  const lastSuccessfulStatsRef = useRef<RequesterPipelineStats | null>(null);

  const {
    data: stats,
    error: statsError,
    isPending: statsPending,
  } = useQuery<RequesterPipelineStats>({
    queryKey: [
      "/api/requester/introduction-requests/stats",
      statsQueryParams,
      { userId: user?.id },
    ],
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (stats) {
      lastSuccessfulStatsRef.current = stats;
    }
  }, [stats]);

  const hasSuccessfulStatsEver =
    stats != null || lastSuccessfulStatsRef.current != null;
  const displayStats =
    stats ?? lastSuccessfulStatsRef.current ?? EMPTY_REQUESTER_STATS;
  const statsLoadError =
    !!statsError && !hasSuccessfulStatsEver && !statsPending;

  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: ["/api/requester/introduction-requests/stats"],
    });

    if (normalizedTab === "active") {
      queryClient.invalidateQueries({
        queryKey: ["/api/requester/introduction-requests/pipeline"],
      });
    } else if (normalizedTab === "completed") {
      queryClient.invalidateQueries({
        queryKey: ["/api/requester/introduction-requests/archive"],
      });
    }
  }, [normalizedTab, queryClient]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ["/api/requester/introduction-requests/stats"],
        }),
        queryClient.refetchQueries({
          queryKey: ["/api/requester/introduction-requests/pipeline"],
        }),
        queryClient.refetchQueries({
          queryKey: ["/api/requester/introduction-requests/archive"],
        }),
      ]);
      toast({
        title: "Refreshed",
        description: "Prospect pipeline data has been updated.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Refresh failed",
        description: "Could not refresh prospect pipeline data.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <SEO
        title="My Prospects | Prospectly"
        description="Manage your open requests to meet prospects"
      />
      {/* Header — gradient banner */}
      <div className="flex-none px-4 sm:px-6 pt-4">
        <PageHeaderSection
          title="My Prospects"
          description="Manage your open requests to meet prospects"
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
                      key: "total",
                      label:
                        displayStats.totalAllRequests === 1
                          ? "Total Request"
                          : "Total Requests",
                      icon: Inbox,
                      value: displayStats.totalAllRequests,
                    },
                    {
                      key: "active",
                      label: "In Pipeline",
                      icon: GitBranch,
                      value: displayStats.activeRequests,
                    },
                    {
                      key: "value",
                      label: "Business Value",
                      icon: DollarSign,
                      value: displayStats.businessValue,
                      prefix: "$",
                    },
                    {
                      key: "response",
                      label: "Response Rate",
                      icon: TrendingUp,
                      value: displayStats.responseRate,
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
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col pt-4 pb-0 overflow-hidden min-h-0">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full h-full flex flex-col"
        >
          <PipelineTabs
            tabs={[
              {
                value: "active",
                label: "Open Requests",
                icon: GitBranch,
                badge: statsLoadError ? undefined : displayStats.activeRequests,
                color: "purple",
              },
              {
                value: "completed",
                label: "Archive",
                icon: Archive,
                badge: statsLoadError
                  ? undefined
                  : displayStats.completedRequests,
                color: "emerald",
              },
            ]}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
            filterContainerId="request-pipeline-filter-container"
            showFilter={normalizedTab === "active"}
            showSearch
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder="Search meetings, prospects, connectors…"
            className="mx-4 sm:mx-6"
            containerMinWidth="min-w-[550px]"
            tabsListMinWidth="min-w-[400px]"
            tabsListMaxWidth="max-w-lg"
          />

          <TabsContent
            value="active"
            className="mt-0 flex-1 overflow-hidden min-h-0 h-full max-h-full"
          >
            <RequestPipelineTab
              search={debouncedSearch}
              onSwitchToArchive={() => handleTabChange("completed")}
              emailLinkParams={emailLinkParams}
              onEmailLinkHandled={clearEmailLinkParams}
            />
          </TabsContent>

          <TabsContent
            value="completed"
            className="mt-0 flex-1 overflow-y-auto min-h-0 pr-1 pb-4 mx-4 sm:mx-6"
          >
            <CompletedRequestsTab
              search={debouncedSearch}
              emailLinkParams={emailLinkParams}
              onEmailLinkHandled={clearEmailLinkParams}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
