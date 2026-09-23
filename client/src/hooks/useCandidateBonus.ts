import { useQuery } from "@tanstack/react-query";
import { toUTC } from "@/lib/dayjs";
import { candidateBonusApi } from "@/lib/api/candidate-bonus";
import type {
  CandidateBonusListResponse,
  CandidateBonusDetailResponse,
} from "@/lib/api/candidate-bonus";

export type DatePreset =
  | "all"
  | "last7days"
  | "last30days"
  | "last3months"
  | "lastyear"
  | "custom";

export interface CandidateBonusFilters {
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

export function useCandidateBonus(
  filters: CandidateBonusFilters = {},
  options?: { enabled?: boolean }
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

  const params = {
    page,
    limit,
    search,
    status,
    sortBy,
    sortOrder,
    datePreset,
    startDate: utcStartDate,
    endDate: utcEndDate,
  };

  const { data, isLoading, isFetching, error, refetch } =
    useQuery<CandidateBonusListResponse>({
      queryKey: ["/api/recruitment/candidate-bonus", params],
      queryFn: () => candidateBonusApi.getList(params),
      staleTime: 30 * 1000,
      placeholderData: (prev) => prev,
      enabled: options?.enabled,
    });

  return {
    bonuses: data?.bonuses ?? [],
    pagination: data?.pagination ?? DEFAULT_PAGINATION,
    loading: isLoading,
    isFetching,
    error,
    refetch,
  };
}

export function useCandidateBonusDetail(id: string | null) {
  const { data, isLoading, error } = useQuery<CandidateBonusDetailResponse>({
    // Array key (not string interpolation) so a null id never leaks into the
    // cache key. The query is gated by `enabled` and only runs with a real id.
    queryKey: ["/api/recruitment/candidate-bonus", "detail", id],
    queryFn: () => candidateBonusApi.getDetail(id as string),
    enabled: !!id,
    staleTime: 30 * 1000,
  });

  return {
    detail: data ?? null,
    loading: isLoading,
    error,
  };
}
