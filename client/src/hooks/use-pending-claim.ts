import { useState, useEffect, useCallback } from "react";

const PENDING_CLAIM_KEY = "prospectly_pending_claim";

export interface PendingClaim {
  requestId: string;
  sharerCode: string;
  prospectName: string;
  prospectCompany: string;
  bountyAmount: number;
  createdAt: number;
}

/**
 * Hook to manage pending claims for unauthenticated users.
 * When a user clicks "Claim" on a public request page without being logged in,
 * we store the claim intent and resume it after authentication.
 */
export function usePendingClaim() {
  const [pendingClaim, setPendingClaimState] = useState<PendingClaim | null>(
    null
  );

  // Load pending claim from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(PENDING_CLAIM_KEY);
    if (stored) {
      try {
        const claim = JSON.parse(stored) as PendingClaim;
        // Expire after 30 minutes
        if (Date.now() - claim.createdAt < 30 * 60 * 1000) {
          setPendingClaimState(claim);
        } else {
          localStorage.removeItem(PENDING_CLAIM_KEY);
        }
      } catch {
        localStorage.removeItem(PENDING_CLAIM_KEY);
      }
    }
  }, []);

  const setPendingClaim = useCallback(
    (claim: Omit<PendingClaim, "createdAt">) => {
      const fullClaim: PendingClaim = {
        ...claim,
        createdAt: Date.now(),
      };
      localStorage.setItem(PENDING_CLAIM_KEY, JSON.stringify(fullClaim));
      setPendingClaimState(fullClaim);
    },
    []
  );

  const clearPendingClaim = useCallback(() => {
    localStorage.removeItem(PENDING_CLAIM_KEY);
    setPendingClaimState(null);
  }, []);

  const hasPendingClaim = pendingClaim !== null;

  return {
    pendingClaim,
    hasPendingClaim,
    setPendingClaim,
    clearPendingClaim,
  };
}
