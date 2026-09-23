import { useQuery } from "@tanstack/react-query";

export interface DashboardStatsItem {
  pendingIntros: {
    value: number;
    urgentCount: number;
  };
  meetingsBooked: {
    value: number;
    weeklyChange: number;
  };
  meetingsCompleted: {
    value: number;
    weeklyChange: number;
  };
  peerFeedbacks: {
    value: number;
    pendingCount: number;
  };
  totalInvested: {
    value: number;
    escrowAmount: number;
  };
  totalEarned: {
    value: number;
    inEscrow: number;
  };
}

export function useDashboardStats() {
  const { data, isLoading, error, refetch } = useQuery<DashboardStatsItem[]>({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  return {
    stats: data?.[0] || null,
    loading: isLoading,
    error,
    refetch,
  };
}
