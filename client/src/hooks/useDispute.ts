import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Dispute } from "@/types/dispute";
import { QUERY_KEYS } from "@/constants/api";

export function useDispute(disputeId?: string) {
  const { data, isLoading, error, refetch } = useQuery<Dispute>({
    queryKey: [QUERY_KEYS.DISPUTES, disputeId],
    queryFn: async () => {
      if (!disputeId) throw new Error("Dispute ID is required");
      return apiRequest(`/disputes/${disputeId}`);
    },
    enabled: !!disputeId,
    refetchOnWindowFocus: false,
  });

  return {
    dispute: data,
    isLoading,
    error,
    refetch,
  };
}
