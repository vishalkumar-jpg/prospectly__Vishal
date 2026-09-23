import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { PayoutStatus } from "@/lib/api/payments";
import { getStripePayoutStatusQueryKey } from "@/lib/stripe-connect";

/** Base query key prefix — invalidating it matches every user-scoped variant. */
const PAYOUT_STATUS_KEY_PREFIX = ["/api/stripe/payouts/status"] as const;

type UsePayoutStatusOptions = {
  /**
   * Gate background polling. When `true`, the query polls every 5s ONLY while
   * the account is connected-but-not-complete (waiting on verification), and
   * stops automatically once it resolves — so it never hammers the
   * Stripe-backed status endpoint. Callers pass `poll: isModalOpen`.
   */
  poll?: boolean;
  /** Disable the query entirely (e.g. surface not mounted). */
  enabled?: boolean;
};

/**
 * Shared TanStack Query access to the signed-in user's Stripe payout status.
 *
 * All payout surfaces (sidebar, payout pages, the setup modal) read through the
 * same query key, so a single invalidation — or a window-focus refetch after
 * the user returns from Stripe-hosted onboarding — updates every surface at
 * once. The redirect param is never trusted for state; this always re-reads the
 * authenticated, server-verified status endpoint.
 */
export function usePayoutStatus(options: UsePayoutStatusOptions = {}) {
  const { poll = false, enabled = true } = options;
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const query = useQuery<PayoutStatus>({
    queryKey:
      userId != null
        ? getStripePayoutStatusQueryKey(userId)
        : ([...PAYOUT_STATUS_KEY_PREFIX, "pending"] as const),
    queryFn: () => api.stripe.getPayoutStatus(),
    enabled: enabled && userId != null,
    staleTime: 30 * 1000,
    // While a setup surface is open (`poll`), always refetch on focus so the
    // popup updates the instant the user returns from the Stripe onboarding tab
    // — even within the stale window. Other consumers stay stale-gated.
    refetchOnWindowFocus: poll ? "always" : true,
    // Poll only while waiting on verification of a connected account; auto-stops
    // once onboarding completes (or if not connected).
    refetchInterval: (query) => {
      if (!poll) return false;
      const data = query.state.data;
      return data?.isConnected && !data.onboardingComplete ? 5000 : false;
    },
  });

  /** Invalidate the payout status for every surface (prefix match). */
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: PAYOUT_STATUS_KEY_PREFIX }),
    [queryClient]
  );

  /**
   * Authoritatively reconcile onboarding after the user returns from Stripe.
   * Calling account-link makes Stripe report "already onboarded" for completed
   * accounts, which the server catches and persists — then we refresh. Any
   * returned URL is intentionally ignored (never opened) so this is a pure sync.
   */
  const reconcile = useCallback(async () => {
    try {
      await api.stripe.getPayoutAccountLink();
    } catch {
      // ignore — refresh below still reflects the latest server state
    }
    await refresh();
  }, [refresh]);

  return {
    status: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    refresh,
    reconcile,
  };
}

export { PAYOUT_STATUS_KEY_PREFIX };
