import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { gtagService } from "@/lib/gtag";

/**
 * Sends a Google Analytics page_view on every route change.
 * Mount once inside BrowserRouter (e.g., in App.tsx).
 *
 * Depends on `search` as well as `pathname` because several pages are
 * tab-driven via `?tab=` and would otherwise never re-fire.
 */
export function usePageviewTracking(): void {
  const location = useLocation();

  useEffect(() => {
    gtagService.trackPageview({
      pathname: location.pathname,
      search: location.search,
    });
  }, [location.pathname, location.search]);
}
