import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface UseMySharedRequestsParams {
  page?: number;
  limit?: number;
}

export function useMySharedRequests(params: UseMySharedRequestsParams = {}) {
  const { page = 1, limit = 20 } = params;

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["/api/marketplace/my-shares", { page, limit }],
    queryFn: () => api.marketplace.getMyShares({ page, limit }),
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    shares: data?.shares || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 20,
    loading: isLoading,
    fetching: isFetching,
    error,
    refetch,
  };
}

/* Unused hook - commented out
export function useShareAnalytics(shareId: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/marketplace/my-shares/analytics", shareId],
    queryFn: () =>
      shareId ? api.marketplace.getShareAnalytics(shareId) : null,
    enabled: !!shareId,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    analytics: data,
    loading: isLoading,
    error,
    refetch,
  };
}
*/

/**
 * Hook to fetch and aggregate analytics from multiple share IDs
 * Used for consolidated introduction request records
 * Backend returns event types as keys (view, click, signup_start, signup_complete, claim_start, claim_complete)
 */
/* Unused hook - commented out
export function useConsolidatedAnalytics(
  shareIds: string[],
  sharePlatforms: Array<{
    shareId: string;
    platform: "linkedin" | "twitter" | "facebook" | "copy";
  }>
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/marketplace/my-shares/consolidated-analytics", shareIds],
    queryFn: async () => {
      if (!shareIds || shareIds.length === 0) {
        return {
          totalClicks: 0,
          signupAttempts: 0,
          claimAttempts: 0,
          successfulClaims: 0,
          totalShares: shareIds.length,
          sharesByPlatform: {
            facebook: 0,
            twitter: 0,
            linkedin: 0,
            copy: 0,
          },
          platformAnalytics: [],
        };
      }

      // Create a map of shareId -> platform
      const platformMap = new Map(
        sharePlatforms.map((sp) => [sp.shareId, sp.platform])
      );

      // Fetch analytics for all shareIds in parallel
      const analyticsPromises = shareIds.map((id) =>
        api.marketplace.getShareAnalytics(id).catch(() => {
          // Return empty analytics object on error
          // Backend returns event types as keys, so we return an object with those keys
          return {
            view: 0,
            click: 0,
            signup_start: 0,
            signup_complete: 0,
            claim_start: 0,
            claim_complete: 0,
            uniqueViews: 0,
            conversionRate: 0,
          };
        })
      );

      const results = await Promise.all(analyticsPromises);

      // Type for analytics response - backend may return event types as keys or standard field names
      type AnalyticsResponse = {
        view?: number;
        views?: number;
        click?: number;
        clicks?: number;
        signup_start?: number;
        signupAttempts?: number;
        signup_complete?: number;
        claim_start?: number;
        claims?: number;
        claim_complete?: number;
        completedClaims?: number;
        uniqueViews?: number;
        conversionRate?: number;
      };

      // Aggregate results - backend returns event types as keys
      const aggregated = results.reduce(
        (acc, analytics: AnalyticsResponse, index) => {
          const shareId = shareIds[index];
          const platform = platformMap.get(shareId) || "copy";

          // Map backend event types to frontend field names
          const clicks = analytics?.click || analytics?.clicks || 0;
          const signups =
            analytics?.signup_start || analytics?.signupAttempts || 0;
          const claims = analytics?.claim_start || analytics?.claims || 0;
          const completed =
            analytics?.claim_complete || analytics?.completedClaims || 0;

          acc.totalClicks += clicks;
          acc.signupAttempts += signups;
          acc.claimAttempts += claims;
          acc.successfulClaims += completed;

          // Store per-platform analytics
          if (!acc.platformAnalytics) {
            acc.platformAnalytics = [];
          }

          // Find or create platform analytics entry
          let platformAnalytics = acc.platformAnalytics.find(
            (pa) => pa.platform === platform
          );
          if (!platformAnalytics) {
            platformAnalytics = {
              platform,
              clicks: 0,
              signupAttempts: 0,
              claimAttempts: 0,
              successfulClaims: 0,
            };
            acc.platformAnalytics.push(platformAnalytics);
          }

          // Add to platform totals
          platformAnalytics.clicks += clicks;
          platformAnalytics.signupAttempts += signups;
          platformAnalytics.claimAttempts += claims;
          platformAnalytics.successfulClaims += completed;

          return acc;
        },
        {
          totalClicks: 0,
          signupAttempts: 0,
          claimAttempts: 0,
          successfulClaims: 0,
          platformAnalytics: [] as Array<{
            platform: "linkedin" | "twitter" | "facebook" | "copy";
            clicks: number;
            signupAttempts: number;
            claimAttempts: number;
            successfulClaims: number;
          }>,
        }
      );

      return {
        totalClicks: aggregated.totalClicks,
        signupAttempts: aggregated.signupAttempts,
        claimAttempts: aggregated.claimAttempts,
        successfulClaims: aggregated.successfulClaims,
        totalShares: shareIds.length,
        sharesByPlatform: {
          facebook: 0, // Platform breakdown is handled in the transformer
          twitter: 0,
          linkedin: 0,
          copy: 0,
        },
        platformAnalytics: aggregated.platformAnalytics,
      };
    },
    enabled: shareIds.length > 0,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    analytics: data,
    loading: isLoading,
    error,
    refetch,
  };
}
*/
