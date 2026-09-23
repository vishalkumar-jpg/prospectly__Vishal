import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MATCH_SCORE_URL_PARAM,
  parseMatchScoreRangesFromUrl,
  serializeMatchScoreRangesForUrl,
} from "@/lib/recruitment/match-score-range-filter.utils";

/**
 * Syncs match-score range filter with the URL so refresh keeps the selection.
 * Preserves unrelated query params (e.g. search, candidate).
 */
export function useMatchScoreRangesFromUrl() {
  const [searchParams, setSearchParams] = useSearchParams();

  const matchScoreRanges = useMemo(
    () => parseMatchScoreRangesFromUrl(searchParams.get(MATCH_SCORE_URL_PARAM)),
    [searchParams]
  );

  const setMatchScoreRanges = useCallback(
    (next: string[]) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          const serialized = serializeMatchScoreRangesForUrl(next);
          if (serialized) {
            params.set(MATCH_SCORE_URL_PARAM, serialized);
          } else {
            params.delete(MATCH_SCORE_URL_PARAM);
          }
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  return { matchScoreRanges, setMatchScoreRanges } as const;
}
