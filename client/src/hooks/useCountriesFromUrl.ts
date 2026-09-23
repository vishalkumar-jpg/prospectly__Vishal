import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  COUNTRIES_URL_PARAM,
  parseCountriesFromUrl,
  serializeCountriesForUrl,
} from "@/lib/recruitment/country-filter.utils";

/**
 * Syncs country filter selection with the URL so refresh keeps the selection.
 * Preserves unrelated query params (e.g. search).
 */
export function useCountriesFromUrl() {
  const [searchParams, setSearchParams] = useSearchParams();

  const countries = useMemo(
    () => parseCountriesFromUrl(searchParams.get(COUNTRIES_URL_PARAM)),
    [searchParams]
  );

  const setCountries = useCallback(
    (next: string[]) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          const serialized = serializeCountriesForUrl(next);
          if (serialized) {
            params.set(COUNTRIES_URL_PARAM, serialized);
          } else {
            params.delete(COUNTRIES_URL_PARAM);
          }
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  return { countries, setCountries } as const;
}
