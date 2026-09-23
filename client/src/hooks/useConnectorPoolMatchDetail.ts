import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useConnectorPoolMatchDetail(matchId: string | undefined) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/recruitment/connector-pipeline/match", matchId],
    queryFn: () => api.recruitment.getConnectorPoolMatchDetail(matchId!),
    enabled: !!matchId,
    staleTime: 30 * 1000,
  });

  return {
    candidate: data ?? null,
    loading: isLoading,
    error,
    refetch,
  };
}
