import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface PriorityActions {
  urgentIntros: {
    count: number;
    message: string;
  };
  upcomingMeetings: {
    thisWeekCount: number;
    thisMonthCount: number;
    totalCount: number;
    nextMeetingDate: string | null;
  };
  marketplaceOpportunities: {
    count: number;
  };
}

export function usePriorityActions() {
  const { data, isLoading, error, refetch } = useQuery<PriorityActions>({
    queryKey: ["/api/dashboard/priority-actions"],
    queryFn: () => api.dashboard.priorityActions(),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  return {
    priorityActions: data || null,
    loading: isLoading,
    error,
    refetch,
  };
}
