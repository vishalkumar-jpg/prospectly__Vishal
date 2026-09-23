import { useQuery } from "@tanstack/react-query";
import { toUTC } from "@/lib/dayjs";
import type {
  ConnectorEarningListResponse,
  ConnectorEarningStatsResponse,
  ConnectorEarningDetailResponse,
} from "@/lib/api/connector-earning";

export type DatePreset =
  | "all"
  | "last7days"
  | "last30days"
  | "last3months"
  | "lastyear"
  | "custom";

export interface ConnectorEarningFilters {
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

const DEFAULT_STATS: ConnectorEarningStatsResponse = {
  totalEarnings: 0,
  totalEarningsThisMonth: 0,
  totalEarningsLastMonth: 0,
  pendingPayouts: 0,
};

export function useConnectorEarning(
  filters: ConnectorEarningFilters = {},
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
    useQuery<ConnectorEarningListResponse>({
      queryKey: [
        "/api/recruitment/earning",
        {
          page,
          limit,
          search,
          status,
          sortBy,
          sortOrder,
          datePreset,
          startDate: utcStartDate,
          endDate: utcEndDate,
        },
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

export function useConnectorEarningStats(options?: { enabled?: boolean }) {
  const { data, isLoading, error } = useQuery<ConnectorEarningStatsResponse>({
    queryKey: ["/api/recruitment/earning/stats"],
    staleTime: 60 * 1000,
    enabled: options?.enabled,
  });

  return {
    stats: data ?? DEFAULT_STATS,
    loading: isLoading,
    error,
  };
}

export function useConnectorEarningDetail(id: string | null) {
  const { data, isLoading, error } = useQuery<ConnectorEarningDetailResponse>({
    queryKey: [`/api/recruitment/earning/${id}`],
    enabled: !!id,
    staleTime: 30 * 1000,
  });

  return {
    detail: data ?? null,
    loading: isLoading,
    error,
  };
}
