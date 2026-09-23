import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getPublicJobQueryKey } from "@/lib/public-job-query";

export function usePublicJob(
  jobId: string | undefined,
  ref?: string | null,
  includeClosed?: boolean
) {
  const normalizedRef = ref || undefined;
  const { data, isPending, error, refetch } = useQuery({
    queryKey: getPublicJobQueryKey(jobId, ref, includeClosed),
    queryFn: () =>
      api.recruitment.getPublicJob(
        jobId as string,
        normalizedRef,
        includeClosed
      ),
    enabled: !!jobId,
    staleTime: 60 * 1000,
    retry: 1,
  });

  return {
    job: data || null,
    loading: isPending && !data,
    error,
    refetch,
  };
}
