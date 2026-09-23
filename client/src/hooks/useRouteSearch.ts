import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export const ROUTE_SEARCH_PARAM = "search";

export interface UseRouteSearchOptions {
  /** Query param name (default: `search`) */
  paramName?: string;
}

/**
 * Syncs a search string with the URL query string so links can be shared.
 * Preserves unrelated query params (e.g. disputeId, claim, highlight).
 */
export function useRouteSearch(options: UseRouteSearchOptions = {}) {
  const paramName = options.paramName ?? ROUTE_SEARCH_PARAM;
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const urlValue = urlSearchParams.get(paramName) ?? "";

  const [search, setSearchState] = useState(urlValue);

  useEffect(() => {
    setSearchState(urlValue);
  }, [urlValue]);

  const setSearch = useCallback(
    (value: string) => {
      setSearchState(value);
      setUrlSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value.trim()) {
            next.set(paramName, value);
          } else {
            next.delete(paramName);
          }
          return next;
        },
        { replace: true }
      );
    },
    [paramName, setUrlSearchParams]
  );

  const clearSearch = useCallback(() => {
    setSearch("");
  }, [setSearch]);

  return { search, setSearch, clearSearch } as const;
}

/** Remove the search param from existing query string (for tab navigation). */
export function withoutRouteSearch(
  search: string,
  paramName = ROUTE_SEARCH_PARAM
): string {
  const params = new URLSearchParams(search);
  params.delete(paramName);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const PROSPECT_SEARCH_PARAM_KEYS = [
  "name",
  "title",
  "company",
  "website",
  "location",
  "linkedinUrl",
] as const;

export type ProspectSearchQuery = Partial<
  Record<(typeof PROSPECT_SEARCH_PARAM_KEYS)[number], string>
>;

export function readProspectSearchFromUrl(
  params: URLSearchParams
): ProspectSearchQuery | null {
  const result: ProspectSearchQuery = {};
  let hasAny = false;

  for (const key of PROSPECT_SEARCH_PARAM_KEYS) {
    const value = params.get(key)?.trim();
    if (value) {
      result[key] = value;
      hasAny = true;
    }
  }

  return hasAny ? result : null;
}

export function writeProspectSearchToUrl(
  prev: URLSearchParams,
  query: ProspectSearchQuery
): URLSearchParams {
  const next = new URLSearchParams(prev);

  for (const key of PROSPECT_SEARCH_PARAM_KEYS) {
    next.delete(key);
  }

  for (const key of PROSPECT_SEARCH_PARAM_KEYS) {
    const value = query[key]?.trim();
    if (value) {
      next.set(key, value);
    }
  }

  return next;
}
