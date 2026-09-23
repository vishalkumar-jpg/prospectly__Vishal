import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useConnectorCandidateDetail(candidateId: string | undefined) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/recruitment/connector-pipeline/candidate", candidateId],
    queryFn: () => api.recruitment.getConnectorCandidateDetail(candidateId!),
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
