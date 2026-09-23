import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface HighValueOpportunity {
  id: string;
  bountyAmount: number;
  title: string;
  description: string;
  isUrgent?: boolean;
}

export interface HighValueOpportunitiesResponse {
  opportunities: HighValueOpportunity[];
}

export function useHighValueOpportunities() {
  const { data, isLoading, error, refetch } =
    useQuery<HighValueOpportunitiesResponse>({
      queryKey: ["/api/dashboard/high-value-opportunities"],
      queryFn: () => api.dashboard.highValueOpportunities(),
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: true,
    });

  return {
    opportunities: data?.opportunities || [],
    loading: isLoading,
    error,
    refetch,
  };
}
