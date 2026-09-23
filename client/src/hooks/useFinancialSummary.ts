import { useQuery } from "@tanstack/react-query";

export interface FinancialSummary {
  totalSpent: number;
  totalRefunded: number;
  availableBalance: number;
  pendingPayouts: number;
  pendingCharges: number;
  role: "requester" | "connector" | "both";
  monthOverMonthChange: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
}

export function useFinancialSummary(options?: { enabled?: boolean }) {
  const { data, isLoading, error, refetch } = useQuery<FinancialSummary>({
    queryKey: ["/api/finances/overview/summary"],
    retry: 1,
    enabled: options?.enabled,
  });

  return {
    summary: data ?? {
      totalSpent: 0,
      totalRefunded: 0,
      availableBalance: 0,
      pendingPayouts: 0,
      pendingCharges: 0,
      role: "both" as const,
      monthOverMonthChange: 0,
      thisMonthEarnings: 0,
      lastMonthEarnings: 0,
    },
    loading: isLoading,
    error,
    refetch,
  };
}
