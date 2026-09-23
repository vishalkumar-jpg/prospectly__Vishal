import { useQuery } from "@tanstack/react-query";

export type TimeRange = "7d" | "30d" | "90d" | "1y" | "all";

interface ChartDataPoint {
  date: string;
  credits: number;
  debits: number;
}

interface RevenueChartResponse {
  data: ChartDataPoint[];
  totalCredits: number;
  totalDebits: number;
}

interface BreakdownItem {
  name: string;
  value: number;
  percentage: number;
}

interface TransactionBreakdownResponse {
  data: BreakdownItem[];
  totalVolume: number;
}

export function useFinancialCharts(timeRange: TimeRange = "30d") {
  // Use default queryFn which automatically handles token refresh
  // apiRequestForQuery already unwraps the { data: T } response, so chartResponse is RevenueChartResponse directly
  const { data: chartResponse, isLoading: chartLoading } =
    useQuery<RevenueChartResponse>({
      queryKey: ["/api/finances/overview/revenue-chart", { timeRange }],
      // Default queryFn from queryClient will handle the request with automatic token refresh
      retry: 1,
    });

  const { data: breakdownResponse, isLoading: breakdownLoading } =
    useQuery<TransactionBreakdownResponse>({
      queryKey: ["/api/finances/overview/breakdown", { timeRange }],
      // Default queryFn from queryClient will handle the request with automatic token refresh
      retry: 1,
    });

  // Extract data from the unwrapped response (apiRequestForQuery already unwraps { data: T } to T)
  const chartData = chartResponse?.data ?? [];
  const totalCredits = chartResponse?.totalCredits ?? 0;
  const totalDebits = chartResponse?.totalDebits ?? 0;
  const breakdownData = breakdownResponse?.data ?? [];
  const totalVolume = breakdownResponse?.totalVolume ?? 0;

  return {
    chartData,
    totalCredits,
    totalDebits,
    breakdownData,
    totalVolume,
    isLoading: chartLoading || breakdownLoading,
  };
}
