import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface BrowseParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  urgency?: string;
}

export function useMarketplaceBrowse(params: BrowseParams = {}) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["/api/marketplace/browse", params],
    queryFn: () => api.marketplace.browse(params),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  return {
    requests: data?.requests || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 20,
    loading: isLoading,
    fetching: isFetching,
    error,
    refetch,
  };
}
