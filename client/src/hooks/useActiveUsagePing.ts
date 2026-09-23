import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { analytics } from "@/lib/analytics";

/**
 * Fires an "Active Usage Ping" event on route changes,
 * throttled to at most once every 5 minutes.
 * Mount once inside BrowserRouter (e.g., in App.tsx).
 */
export function useActiveUsagePing(): void {
  const location = useLocation();

  useEffect(() => {
    analytics.trackActiveUsagePing({
      route: location.pathname,
      interactionType: "navigation",
    });
  }, [location.pathname]);
}
