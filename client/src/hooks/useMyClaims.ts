import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface UseMyClaimsParams {
  page?: number;
  limit?: number;
}

export function useMyClaims(params: UseMyClaimsParams = {}) {
  const { page = 1, limit = 20 } = params;

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["/api/marketplace/my-claims", { page, limit }],
    queryFn: () => api.marketplace.getMyClaims({ page, limit }),
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    claims: data?.claims || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 20,
    loading: isLoading,
    fetching: isFetching,
    error,
    refetch,
  };
}
