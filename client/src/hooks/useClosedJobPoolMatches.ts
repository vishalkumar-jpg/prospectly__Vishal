import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { JobPoolMatchesParams } from "@/lib/api/recruitment";

const CLOSED_JOB_POOL_MATCHES_KEY = "/api/recruitment/job-pool-matches/closed";

export function useClosedJobPoolMatches(
  params: JobPoolMatchesParams & { enabled?: boolean } = {}
) {
  const { page = 1, limit = 10, search, enabled = true } = params;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [CLOSED_JOB_POOL_MATCHES_KEY, { page, limit, search }],
    queryFn: () =>
      api.recruitment.getClosedJobPoolMatches({ page, limit, search }),
    enabled: enabled !== false,
    refetchOnMount: "always",
  });

  return {
    jobs: data?.jobs ?? [],
    pagination: data?.pagination ?? null,
    loading: isLoading,
    error,
    refetch,
  };
}
