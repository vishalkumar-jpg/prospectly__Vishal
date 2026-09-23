import { useQuery } from "@tanstack/react-query";
import { recruitmentCandidateSearchApi } from "@/lib/api/recruitment-candidate-search";

/** Separate from the search key: facets must survive every search invalidation. */
export const CANDIDATE_SEARCH_FACETS_QUERY_KEY =
  "/api/recruitment/cross-job-candidate-search/facets";

/**
 * Facet values for the drawer's multi-selects and the quick-filter row.
 *
 * Scope-wide counts that shift only when the pipeline does, so one fetch per
 * session-ish is plenty — five minutes of staleness costs a slightly outdated
 * count, while refetching per drawer open costs an aggregate query each time.
 */
export function useCandidateSearchFacets(enabled = true) {
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: [CANDIDATE_SEARCH_FACETS_QUERY_KEY],
    queryFn: () => recruitmentCandidateSearchApi.getCandidateSearchFacets(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    facets: enabled ? data : undefined,
    loading: enabled && isFetching,
    error: enabled ? error : null,
    refetch,
  } as const;
}
