import { useQuery } from "@tanstack/react-query";

interface RecentActivityItem {
  id: string;
  type: "intro_commission" | "bounty_payment" | "payout" | "refund";
  amount: number;
  description: string;
  status: "completed" | "pending" | "processing" | "failed";
  createdAt: string;
  contactName?: string;
  requesterName?: string;
}

interface RecentActivityResponse {
  activities: RecentActivityItem[];
  totalCount: number;
}

export function useRecentActivity(limit: number = 10, options?: { enabled?: boolean }) {
  // Use default queryFn which automatically handles token refresh
  const { data, isLoading, error, refetch } = useQuery<RecentActivityResponse>({
    queryKey: ["/api/finances/overview/recent-activity", { limit }],
    // Default queryFn from queryClient will handle the request with automatic token refresh
    retry: 1,
    enabled: options?.enabled,
  });

  return {
    activities: data?.activities ?? [],
    totalCount: data?.totalCount ?? 0,
    isLoading,
    error,
    refetch,
  };
}

export type { RecentActivityItem };
