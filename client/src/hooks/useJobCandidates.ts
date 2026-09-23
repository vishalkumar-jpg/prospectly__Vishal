import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { JobCandidatesParams } from "@/lib/api/recruitment";

export function useJobCandidates(
  jobId: string | undefined,
  params?: JobCandidatesParams
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/recruitment/candidates/job", jobId, params],
    queryFn: () => api.recruitment.getJobCandidates(jobId!, params),
    enabled: !!jobId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  return {
    candidates: data?.candidates ?? [],
    loading: isLoading,
    error,
    refetch,
  };
}
