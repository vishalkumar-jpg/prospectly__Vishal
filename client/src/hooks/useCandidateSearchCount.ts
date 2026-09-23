import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { recruitmentCandidateSearchApi } from "@/lib/api/recruitment-candidate-search";
import {
  toCountRequestBody,
  type CandidateSearchCriteria,
} from "@/lib/recruitment/candidate-search.criteria";
import { CANDIDATE_SEARCH_QUERY_KEY } from "@/hooks/useCandidateSearch";

/** Its own leaf under the search key, so results and counts never evict each other. */
export const CANDIDATE_SEARCH_COUNT_QUERY_KEY = `${CANDIDATE_SEARCH_QUERY_KEY}/count`;

const COUNT_DEBOUNCE_MS = 300;

/**
 * Draft criteria → the drawer footer count.
 *
 * `enabled` is the drawer's open state and is not optional: the draft object
 * still exists while the drawer is closed, and counting a draft nobody is
 * editing is a request nobody asked for.
 */
export function useCandidateSearchCount(
  draft: CandidateSearchCriteria,
  enabled: boolean
) {
  const debounced = useDebouncedValue(draft, COUNT_DEBOUNCE_MS);
  // Structured filters only — sort and paging are not part of a count.
  const body = useMemo(() => toCountRequestBody(debounced), [debounced]);

  const { data, isFetching, error } = useQuery({
    queryKey: [CANDIDATE_SEARCH_COUNT_QUERY_KEY, body],
    queryFn: () => recruitmentCandidateSearchApi.countCandidates(debounced),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
    // The footer keeps the previous number while the next count lands, so the
    // button label does not flicker on every draft edit. A superseded request
    // is dropped by the key change — its result can never land on a newer draft.
    placeholderData: (previous) => previous,
  });

  /** Same placeholderData leak as the search hook — gated once, here. */
  const result = enabled ? data : undefined;

  return {
    count: result?.count ?? 0,
    /**
     * False when a free-text query is applied: `/count` cannot see text
     * ranking, so the footer must read "matching filters" and say the number is
     * an upper bound (§7.3).
     */
    textCounted: result?.textCounted ?? true,
    /** True while the draft has moved but its count has not arrived yet. */
    loading: enabled && (isFetching || debounced !== draft),
    error: enabled ? error : null,
  } as const;
}
