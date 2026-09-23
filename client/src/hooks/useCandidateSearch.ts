import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  recruitmentCandidateSearchApi,
  type CandidateSearchCoverage,
  type CandidateSearchMeta,
  type CandidateSearchRow,
} from "@/lib/api/recruitment-candidate-search";
import {
  toRequestBody,
  type CandidateSearchCriteria,
} from "@/lib/recruitment/candidate-search.criteria";

/**
 * Deliberately NOT prefixed with "/api/recruitment/candidates" or any job/board
 * key. TanStack matches invalidations by key prefix, and the kanban invalidates
 * its board keys after every stage change, note and shortlist — a sibling key
 * would re-POST this search, and re-bill its embedding, on each one.
 */
export const CANDIDATE_SEARCH_QUERY_KEY =
  "/api/recruitment/cross-job-candidate-search";

const EMPTY_ROWS: CandidateSearchRow[] = [];

const EMPTY_META: CandidateSearchMeta = {
  page: 1,
  limit: 0,
  total: 0,
  totalPages: 0,
};

const EMPTY_COVERAGE: CandidateSearchCoverage = {
  totalCandidates: 0,
  withIndexedResume: 0,
  withExperienceYears: 0,
  withEducationLevel: 0,
};

/**
 * Applied criteria → results. Runs on first paint with no criteria (§9.4): the
 * default browse costs no embedding and no planner call (§7.5).
 */
export function useCandidateSearch(
  criteria: CandidateSearchCriteria,
  enabled = true
) {
  // The wire body is the identity of a search: two criteria objects that differ
  // only in unset fields are the same request and must share one cache entry.
  const body = useMemo(() => toRequestBody(criteria), [criteria]);

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: [CANDIDATE_SEARCH_QUERY_KEY, body],
    queryFn: () => recruitmentCandidateSearchApi.searchCandidates(criteria),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    // A POST that can cost an embedding call — never refire it implicitly.
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
    // Keeps the table populated while the next page or filter set is in flight.
    placeholderData: (previous) => previous,
  });

  /**
   * A disabled query still serves placeholderData: TanStack's placeholder
   * branch keys off `status === "pending" && data === undefined`, which is
   * exactly what a disabled query looks like, and it keeps the last defined
   * data for as long as the observer is mounted. Gate it once here so no
   * consumer can render rows from a search that is no longer running.
   */
  const result = enabled ? data : undefined;

  return {
    rows: result?.rows ?? EMPTY_ROWS,
    meta: result?.meta ?? EMPTY_META,
    coverage: result?.coverage ?? EMPTY_COVERAGE,
    /** Keyword-ranked fallback — surface it, never fail and never hide it. */
    degraded: result?.degraded ?? false,
    /** Scored-set cap hit — surface it, no silent caps. */
    truncated: result?.truncated ?? false,
    hasCriteria: result?.hasCriteria ?? false,
    loading: enabled && isFetching,
    error: enabled ? error : null,
    refetch,
  } as const;
}
