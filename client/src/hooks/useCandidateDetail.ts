import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useCandidateDetail(candidateId: string | undefined) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/recruitment/candidates", candidateId],
    queryFn: () => api.recruitment.getCandidateDetail(candidateId!),
    enabled: !!candidateId,
    staleTime: 30 * 1000,
  });

  return {
    candidate: data ?? null,
    loading: isLoading,
    error,
    refetch,
  };
}
