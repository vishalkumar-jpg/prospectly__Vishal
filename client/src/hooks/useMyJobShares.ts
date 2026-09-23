import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface UseMyJobSharesParams {
  page?: number;
  limit?: number;
}

export function useMyJobShares(params: UseMyJobSharesParams = {}) {
  const { page = 1, limit = 20 } = params;

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["/api/recruitment/marketplace/my-job-shares", { page, limit }],
    queryFn: () => api.recruitment.getMyJobShares({ page, limit }),
    staleTime: 30 * 1000,
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
