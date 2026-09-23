import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const ASSESSMENT_BANK_KEY = "/api/recruitment/assessment-bank";
const PAGE_SIZE = 10;

/** List the current recruiter's reusable question bank (paginated + searchable). */
export function useAssessmentBank(params: { search?: string } = {}) {
  const search = params.search?.trim() ?? "";

  const query = useInfiniteQuery({
    queryKey: [ASSESSMENT_BANK_KEY, { search }],
    queryFn: ({ pageParam }) =>
      api.recruitment.listAssessmentBank({
        search: search || undefined,
        page: pageParam,
        limit: PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined,
    // The bank is written to via the job-save flow ("Save to bank"), which does
    // not invalidate this query. Always refetch when the picker mounts so newly
    // saved questions show up without a hard reload.
    staleTime: 0,
    refetchOnMount: "always",
  });

  return {
    questions: query.data?.pages.flatMap((page) => page.questions) ?? [],
    pagination: query.data?.pages.at(-1)?.pagination,
    loading: query.isLoading,
    isFetching: query.isFetching,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    error: query.error,
    refetch: query.refetch,
  };
}
