import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { analytics } from "@/lib/analytics";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PipelineTabs } from "@/components/pipeline/PipelineTabs";
import { MySharedDealsTab, SharerClaimsTab } from "@/components/marketplace";
import { useMySharedRequests } from "@/hooks/useMySharedRequests";
import { transformBackendSharesToFrontend } from "@/lib/marketplace-transformers";
import { Search, BarChart3, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRouteTab } from "@/hooks/useRouteTab";
import { OPPORTUNITIES_TABS, TAB_ROUTE_BASES } from "@/lib/tab-routes";
import {
  BrowseDealsTab,
  MarketplaceHero,
  useMarketplaceFilters,
} from "./marketplace";

type MarketplaceTab = (typeof OPPORTUNITIES_TABS)[number];

export default function GlobalOpportunities() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const filters = useMarketplaceFilters();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useRouteTab<MarketplaceTab>({
    basePath: TAB_ROUTE_BASES.opportunities,
    allowedTabs: OPPORTUNITIES_TABS,
    defaultTab: "browse",
  });

  const claimFromUrl = searchParams.get("claim");

  useEffect(() => {
    analytics.trackFeatureViewed({
      feature: "marketplace",
      route: "/prospecting/opportunities",
      entryPoint: "direct",
    });
  }, []);

  const { shares: rawShares, loading: sharesLoading } = useMySharedRequests();
  const userSharedDeals = transformBackendSharesToFrontend(
    rawShares as never[]
  );

  const {
    data: sharerClaims,
    isLoading: sharerClaimsLoading,
    error: sharerClaimsError,
  } = useQuery({
    queryKey: ["sharer-claims"],
    queryFn: () => api.marketplace.getSharerClaims(),
  });

  // Show error toast when sharer claims fetch fails
  useEffect(() => {
    if (sharerClaimsError) {
      toast({
        title: "Failed to load claims",
        description:
          "Unable to fetch your sharer claims. Please try refreshing the page.",
        variant: "destructive",
      });
    }
  }, [sharerClaimsError, toast]);

  // Use count directly from query result, only when loaded successfully
  const claimsCount =
    !sharerClaimsLoading && !sharerClaimsError && sharerClaims
      ? sharerClaims.length
      : 0;

  // Store sharerCode per deal (dealId -> sharerCode)
  const [dealSharerCodes, setDealSharerCodes] = useState<
    Record<string, string>
  >({});

  const isDealShared = (dealId: string) =>
    userSharedDeals.some((d) => d.dealId === dealId);

  const handleShareClick = async (
    dealId: string,
    platform: "facebook" | "twitter" | "linkedin" | "copy"
  ): Promise<{ sharerCode: string; shareUrl: string } | null> => {
    try {
      // Call backend API to create share record
      const response = await api.marketplace.shareRequest({
        introductionRequestId: dealId,
        platform,
      });

      // Store the sharerCode for this deal
      setDealSharerCodes((prev) => ({
        ...prev,
        [dealId]: response.sharerCode,
      }));

      // Invalidate my-shares query to refresh the "My Shared" tab
      await queryClient.invalidateQueries({
        queryKey: ["/api/marketplace/my-shares"],
      });

      if (platform !== "copy") {
        toast({
          title: "Share tracked",
          description: `Your ${platform} share has been recorded. You'll earn 50% when someone claims this introduction request.`,
        });
      }

      // Return the sharerCode and shareUrl for use in ShareDealPopover
      return {
        sharerCode: response.sharerCode,
        shareUrl: response.shareUrl,
      };
    } catch {
      toast({
        title: "Share failed",
        description:
          "Unable to track your share. Please try again or share manually.",
        variant: "destructive",
      });
      // Return null to indicate failure, component can use fallback
      return null;
    }
  };

  // Get sharerCode for a deal (empty until share is created via API)
  const getSharerCode = (dealId: string): string => {
    return dealSharerCodes[dealId] || "";
  };

  const handleReshare = () => {
    toast({
      title: "Reshare available",
      description: "Use the share popover to reshare this deal.",
    });
  };

  const marketplacePipelineTabs = useMemo(
    () => [
      {
        value: "browse",
        label: "Browse",
        icon: Search,
        badge:
          filters.filteredDeals.length > 0
            ? filters.filteredDeals.length
            : undefined,
        color: "blue" as const,
      },
      {
        value: "shared",
        label: "My Shares",
        icon: BarChart3,
        badge: userSharedDeals.length > 0 ? userSharedDeals.length : undefined,
        color: "purple" as const,
      },
      {
        value: "claims",
        label: "Claims",
        icon: Users,
        badge:
          !sharerClaimsLoading && claimsCount > 0 ? claimsCount : undefined,
        color: "emerald" as const,
      },
    ],
    [
      claimsCount,
      filters.filteredDeals.length,
      sharerClaimsLoading,
      userSharedDeals.length,
    ]
  );

  return (
    <main className="px-2 sm:px-4 md:px-6 py-4 space-y-6">
      <SEO
        title="Opportunities | Prospectly"
        description="Earn referral payout by making warm introductions from your network"
      />
      <MarketplaceHero />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <PipelineTabs
          tabs={marketplacePipelineTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showSearch={activeTab === "browse"}
          searchValue={filters.searchTerm}
          onSearchChange={filters.setSearchTerm}
          searchPlaceholder="Search by name, company, or meeting topic…"
          containerMinWidth="min-w-[550px]"
          tabsListMinWidth="min-w-[530px]"
          tabsListMaxWidth="max-w-3xl"
        />

        <TabsContent value="browse" className="mt-0">
          <BrowseDealsTab
            filteredDeals={filters.filteredDeals}
            isLoading={filters.loading}
            error={filters.error}
            refetch={filters.refetch}
            hasActiveFilters={filters.hasActiveFilters}
            clearFilters={filters.clearFilters}
            isDealShared={isDealShared}
            onShareClick={handleShareClick}
            getSharerCode={getSharerCode}
            totalDeals={filters.totalDeals}
          />
        </TabsContent>

        <TabsContent value="shared" className="mt-0">
          <MySharedDealsTab
            sharedDeals={userSharedDeals}
            onReshare={handleReshare}
            isLoading={sharesLoading}
          />
        </TabsContent>

        <TabsContent value="claims" className="mt-0">
          <SharerClaimsTab highlightedClaimId={claimFromUrl ?? undefined} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
