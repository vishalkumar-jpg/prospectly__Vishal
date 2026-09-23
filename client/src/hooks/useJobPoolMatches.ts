import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { JobPoolMatchesParams } from "@/lib/api/recruitment";

const JOB_POOL_MATCHES_KEY = "/api/recruitment/job-pool-matches";

export function useJobPoolMatches(
  params: Omit<JobPoolMatchesParams, "page"> & { enabled?: boolean } = {}
) {
  const { limit = 10, search, enabled = true } = params;

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [JOB_POOL_MATCHES_KEY, { limit, search }],
    queryFn: ({ pageParam }) =>
      api.recruitment.getJobPoolMatches({ page: pageParam, limit, search }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: enabled !== false,
    refetchOnMount: "always",
  });

  const jobs = data?.pages.flatMap((page) => page.jobs) ?? [];
  const totalJobs = data?.pages[0]?.pagination?.totalJobs ?? jobs.length;

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

export function useApproveJobPoolMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) =>
      api.recruitment.approveJobPoolMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [JOB_POOL_MATCHES_KEY],
      });
    },
  });
}

export function useDeclineJobPoolMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ matchId, reason }: { matchId: string; reason?: string }) =>
      api.recruitment.declineJobPoolMatch(matchId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [JOB_POOL_MATCHES_KEY],
      });
    },
  });
}
