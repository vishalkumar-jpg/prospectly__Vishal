import type { QueryClient, UseQueryResult } from "@tanstack/react-query";

export type DashboardQueryState<TData> = UseQueryResult<TData> & {
  isInitialLoading: boolean;
  isRefreshing: boolean;
};

export const RECRUITER_DASHBOARD_QUERY_OPTIONS = {
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: true,
};

export function invalidateRecruiterDashboardQueries(
  queryClient: QueryClient
): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      typeof query.queryKey[0] === "string" &&
      query.queryKey[0].startsWith("/api/recruiter/dashboard"),
  });
}

export function withDashboardQueryState<TData>(
  query: UseQueryResult<TData>
): DashboardQueryState<TData> {
  return {
    ...query,
    isInitialLoading: query.isPending && query.data === undefined,
    isRefreshing: query.isFetching && query.data !== undefined,
  };
}
