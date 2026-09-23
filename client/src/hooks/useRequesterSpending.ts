import { useQuery } from "@tanstack/react-query";
import { toUTC } from "@/lib/dayjs";
import type {
  SpendingListResponse,
  SpendingStatsResponse,
  SpendingDetailResponse,
} from "@/lib/api/recruitment-spending";

export type DatePreset =
  | "all"
  | "last7days"
  | "last30days"
  | "last3months"
  | "lastyear"
  | "custom";

export interface RequesterSpendingFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  datePreset?: DatePreset;
  startDate?: string;
  endDate?: string;
}

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

export function useRequesterSpending(
  filters: RequesterSpendingFilters = {},
  options?: { enabled?: boolean },
) {
  const {
    page = 1,
    limit = 10,
    search = "",
    status = "all",
    sortBy = "date",
    sortOrder = "desc",
    datePreset = "all",
    startDate,
    endDate,
  } = filters;

  const utcStartDate = startDate ? toUTC(startDate).toISOString() : undefined;
  const utcEndDate = endDate ? toUTC(endDate).toISOString() : undefined;

  const { data, isLoading, isFetching, error, refetch } =
    useQuery<SpendingListResponse>({
      queryKey: [
        "/api/recruitment/spending",
        { page, limit, search, status, sortBy, sortOrder, datePreset, startDate: utcStartDate, endDate: utcEndDate },
      ],
      staleTime: 30 * 1000,
      placeholderData: (prev) => prev,
      enabled: options?.enabled,
    });

  return {
    jobs: data?.jobs ?? [],
    pagination: data?.pagination ?? DEFAULT_PAGINATION,
    loading: isLoading,
    isFetching,
    error,
    refetch,
  };
}

export function useRequesterSpendingStats(options?: { enabled?: boolean }) {
  const { data, isLoading, error } = useQuery<SpendingStatsResponse>({
    queryKey: ["/api/recruitment/spending/stats"],
    staleTime: 60 * 1000,
    enabled: options?.enabled,
  });

  return {
    stats: data ?? { totalSpent: 0, upcomingPayments: 0, spentThisMonth: 0 },
    loading: isLoading,
    error,
  };
}

export function useRequesterSpendingDetail(id: string | null) {
  const { data, isLoading, error } = useQuery<SpendingDetailResponse>({
    queryKey: [`/api/recruitment/spending/${id}`],
    enabled: !!id,
    staleTime: 30 * 1000,
  });

  return {
    detail: data ?? null,
    loading: isLoading,
    error,
  };
}
