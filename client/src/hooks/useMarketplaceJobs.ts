import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface UseMarketplaceJobsParams {
  search?: string;
  countries?: string[];
  limit?: number;
}

export function useMarketplaceJobs(params: UseMarketplaceJobsParams = {}) {
  const { search, countries, limit = 10 } = params;

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["/api/recruitment/marketplace", { search, countries, limit }],
    queryFn: ({ pageParam }) =>
      api.recruitment.getMarketplaceJobs({
        search,
        countries,
        limit,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  const jobs = data?.pages.flatMap((page) => page.jobs) ?? [];
  const totalJobs = data?.pages[0]?.pagination.totalJobs ?? 0;

  return {
    jobs,
    totalJobs,
    loading: isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
  };
}
