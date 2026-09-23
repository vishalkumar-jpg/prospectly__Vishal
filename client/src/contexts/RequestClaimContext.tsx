import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { api } from "@/lib/api";
import { analytics } from "@/lib/analytics";

export interface RequestProspect {
  name: string;
  title: string;
  company: string;
}

export type ClaimStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed";

export interface ClaimStepProgress {
  signup: ClaimStepStatus;
  linkedin: ClaimStepStatus;
  google: ClaimStepStatus;
  microsoft: ClaimStepStatus;
  verification: ClaimStepStatus;
}

export type ClaimOutcome = "pending" | "claimed" | "failed";

// Backwards compatibility mapping
const OUTCOME_MIGRATION: Record<string, ClaimOutcome> = {
  won: "claimed",
  lost: "failed",
};

export interface ActiveRequestClaim {
  requestId: string;
  sharerCode: string;
  claimId?: string; // Backend claim ID for API calls
  prospect: RequestProspect;
  bountyAmount: number;
  claimerShare: number;
  stepProgress: ClaimStepProgress;
  claimedAt: string;
  outcome: ClaimOutcome;
  lostReason?: string;
  status?: string; // Backend claim status
  verificationTriggeredAt?: string; // When manual verification was triggered
}

// Map backend claim status to frontend step progress
export function mapBackendStatusToSteps(
  backendStatus: string,
  currentProgress?: ClaimStepProgress
): ClaimStepProgress {
  const base = currentProgress || {
    signup: "completed" as ClaimStepStatus,
    linkedin: "pending" as ClaimStepStatus,
    google: "pending" as ClaimStepStatus,
    microsoft: "pending" as ClaimStepStatus,
    verification: "pending" as ClaimStepStatus,
  };

  switch (backendStatus) {
    case "pending":
      return { ...base, verification: "pending" };
    case "verifying":
      return { ...base, verification: "in_progress" };
    case "verified":
    case "completed":
      return {
        signup: "completed",
        linkedin: "completed",
        google: "completed",
        microsoft: "completed",
        verification: "completed",
      };
    case "failed":
      return { ...base, verification: "failed" };
    default:
      return base;
  }
}

// Default mock prospect for demo purposes
export const MOCK_PROSPECT: RequestProspect = {
  name: "Jane Smith",
  title: "VP of Marketing",
  company: "Acme Corporation",
};

export const MOCK_BOUNTY = 500;
export const MOCK_CLAIMER_SHARE = 250;

interface RequestClaimContextType {
  activeClaim: ActiveRequestClaim | null;
  hasActiveClaim: boolean;
  completedStepsCount: number;
  isNewUser: boolean;
  canClaimRequests: boolean;
  isLoading: boolean;
  claimRequest: (
    requestId: string,
    sharerCode: string,
    prospect: RequestProspect,
    bountyAmount: number,
    claimerShare: number
  ) => boolean;
  abandonClaim: () => void;
  updateStepProgress: (
    step: keyof ClaimStepProgress,
    status: ClaimStepStatus
  ) => void;
  setOutcome: (outcome: ClaimOutcome, lostReason?: string) => void;
  checkPendingClaim: () => ActiveRequestClaim | null;
  // API integration methods
  refreshClaimStatus: () => Promise<void>;
  triggerVerification: (prospectContactId?: number) => Promise<boolean>;
  completeClaim: () => Promise<boolean>;
  // Dev/testing helpers
  simulateStepComplete: (step: keyof ClaimStepProgress) => void;
  simulateWin: () => void;
  simulateLoss: (reason: string) => void;
  resetDemo: () => void;
  initDemoClaimIfNeeded: () => void;
}

const RequestClaimContext = createContext<RequestClaimContextType | undefined>(
  undefined
);

const STORAGE_KEY = "prospectly_active_claim";
const PENDING_CLAIM_KEY = "pendingRequestClaim";
const ACTIVE_CLAIM_STATUSES = ["pending", "verifying", "verified"] as const;

type MarketplaceClaim = Awaited<
  ReturnType<typeof api.marketplace.getMyClaims>
>["claims"][number];
type MarketplaceClaimStatus = Awaited<
  ReturnType<typeof api.marketplace.getClaimStatus>
> | null;

const getStoredClaim = (): ActiveRequestClaim | null => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as ActiveRequestClaim;
  } catch {
    return null;
  }
};

const getStoredClaimWithOutcomeMigration = (): ActiveRequestClaim | null => {
  const storedClaim = getStoredClaim();
  if (!storedClaim) {
    return null;
  }

  const legacyOutcome = storedClaim.outcome as ClaimOutcome | "won" | "lost";
  if (legacyOutcome === "won" || legacyOutcome === "lost") {
    storedClaim.outcome = OUTCOME_MIGRATION[legacyOutcome];
  }

  return storedClaim;
};

const findMostRelevantClaim = (
  claims: MarketplaceClaim[] | undefined
): MarketplaceClaim | null => {
  if (!claims || claims.length === 0) {
    return null;
  }

  const activeClaim = claims.find((claim) =>
    ACTIVE_CLAIM_STATUSES.includes(
      claim.status as (typeof ACTIVE_CLAIM_STATUSES)[number]
    )
  );

  return activeClaim || claims[0] || null;
};

const getClaimStatusSafely = async (
  claimId?: string
): Promise<MarketplaceClaimStatus> => {
  if (!claimId) {
    return null;
  }

  try {
    return await api.marketplace.getClaimStatus(claimId);
  } catch {
    return null;
  }
};

const getClaimOutcomeFromStatus = (status: string): ClaimOutcome => {
  if (status === "completed") {
    return "claimed";
  }
  if (status === "failed") {
    return "failed";
  }
  return "pending";
};

const mapApiClaimToActiveClaim = ({
  claim,
  claimStatus,
}: {
  claim: MarketplaceClaim;
  claimStatus: MarketplaceClaimStatus;
}): ActiveRequestClaim => ({
  requestId: claim.request.id,
  sharerCode: "", // sharerCode not in API response, will need to be stored separately
  claimId: claim.id,
  prospect: {
    name: claim.request.contactName || "",
    title: "", // Not available in API response
    company: claim.request.contactCompany || "",
  },
  bountyAmount: claim.request.bountyAmount || 0,
  claimerShare:
    claimStatus?.claimerShare ||
    claim.claimerShare ||
    Math.floor((claim.request.bountyAmount || 0) / 2),
  claimedAt: claim.claimedAt || claim.createdAt,
  outcome: getClaimOutcomeFromStatus(claim.status),
  lostReason: claim.failureReason,
  stepProgress: mapBackendStatusToSteps(claim.status),
  // Include status and verificationTriggeredAt for manual verification tracking
  status: claim.status,
  verificationTriggeredAt:
    claimStatus?.verificationTriggeredAt ||
    claim.verificationTriggeredAt ||
    undefined,
});

const withStoredSharerCode = ({
  mappedClaim,
  storedClaim,
}: {
  mappedClaim: ActiveRequestClaim;
  storedClaim: ActiveRequestClaim | null;
}): ActiveRequestClaim => {
  if (
    storedClaim?.sharerCode &&
    storedClaim.requestId === mappedClaim.requestId
  ) {
    return { ...mappedClaim, sharerCode: storedClaim.sharerCode };
  }

  return mappedClaim;
};

// Check if user account is "new" (for demo: created within last 7 days)
const checkIsNewUser = (user: { id: number } | null): boolean => {
  if (!user) return false;
  // For now, we'll consider all authenticated users as eligible
  // In production, this would check user.createdAt or claim history from API
  return true;
};

export function RequestClaimProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [activeClaim, setActiveClaim] = useState<ActiveRequestClaim | null>(
    null
  );
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ========== API Integration Methods ==========

  // Fetch active claim from API
  const fetchActiveClaimFromAPI = useCallback(async (): Promise<void> => {
    if (!user) {
      return;
    }

    try {
      setIsLoading(true);
      // Get user's claims from API
      const response = await api.marketplace.getMyClaims({
        page: 1,
        limit: 10,
      });

      const mostRecentClaim = findMostRelevantClaim(response.claims);

      if (!mostRecentClaim) {
        // No claims found, check if we have a claim in localStorage
        const storedClaim = getStoredClaim();
        if (storedClaim) {
          // Keep localStorage claim but mark it as potentially stale
          return;
        }
        // No active claim
        setActiveClaim(null);
        return;
      }

      const claimStatus = await getClaimStatusSafely(mostRecentClaim.id);
      const mappedClaim = mapApiClaimToActiveClaim({
        claim: mostRecentClaim,
        claimStatus,
      });
      const claimWithSharerCode = withStoredSharerCode({
        mappedClaim,
        storedClaim: getStoredClaim(),
      });

      setActiveClaim(claimWithSharerCode);
    } catch {
      // Fall back to localStorage if API call fails
      const storedClaim = getStoredClaimWithOutcomeMigration();
      if (storedClaim) {
        setActiveClaim(storedClaim);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Refresh claim status from backend
  const refreshClaimStatus = useCallback(async (): Promise<void> => {
    if (!activeClaim?.claimId) {
      // If no claimId, try to fetch from API
      await fetchActiveClaimFromAPI();
      return;
    }

    try {
      setIsLoading(true);
      const status = await api.marketplace.getClaimStatus(activeClaim.claimId);

      // Also fetch full claim list to get prospect info if needed
      const claimsResponse = await api.marketplace.getMyClaims({
        page: 1,
        limit: 10,
      });
      const fullClaim = claimsResponse.claims.find(
        (c) => c.id === activeClaim.claimId
      );

      // Update local state based on backend status
      setActiveClaim((prev) => {
        if (!prev) return prev;

        const newStepProgress = mapBackendStatusToSteps(
          status.status,
          prev.stepProgress
        );
        const newOutcome: ClaimOutcome =
          status.status === "completed"
            ? "claimed"
            : status.status === "failed"
              ? "failed"
              : "pending";

        return {
          ...prev,
          stepProgress: newStepProgress,
          outcome: newOutcome,
          lostReason: status.failureReason,
          claimerShare: status.claimerShare ?? prev.claimerShare,
          // Update prospect info if available
          prospect: fullClaim
            ? {
                name: fullClaim.request.contactName || prev.prospect.name,
                title: prev.prospect.title,
                company:
                  fullClaim.request.contactCompany || prev.prospect.company,
              }
            : prev.prospect,
          // Update status and verificationTriggeredAt for manual verification tracking
          status: status.status,
          verificationTriggeredAt:
            status.verificationTriggeredAt ||
            fullClaim?.verificationTriggeredAt ||
            prev.verificationTriggeredAt,
        };
      });
    } catch {
      // Silently ignored - will retry on next interval
    } finally {
      setIsLoading(false);
    }
  }, [activeClaim?.claimId, fetchActiveClaimFromAPI]);

  // Load active claim from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ActiveRequestClaim;
        // Ensure outcome field exists for backwards compatibility
        if (!parsed.outcome) {
          parsed.outcome = "pending";
        }
        // Migrate old outcome values to new terminology
        const legacyOutcome = parsed.outcome as ClaimOutcome | "won" | "lost";
        if (legacyOutcome === "won" || legacyOutcome === "lost") {
          parsed.outcome = OUTCOME_MIGRATION[legacyOutcome];
        }
        // Migrate old dealId to requestId if needed
        if (
          (parsed as unknown as { dealId?: string }).dealId &&
          !parsed.requestId
        ) {
          parsed.requestId = (parsed as unknown as { dealId: string }).dealId;
        }
        setActiveClaim(parsed);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Check if user is new when user changes
  useEffect(() => {
    setIsNewUser(checkIsNewUser(user));
  }, [user]);

  // Fetch active claim from API on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchActiveClaimFromAPI();
    } else {
      // Clear claim if user logs out
      setActiveClaim(null);
    }
  }, [user, fetchActiveClaimFromAPI]);

  // Save active claim to localStorage whenever it changes
  useEffect(() => {
    if (activeClaim) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeClaim));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeClaim]);

  // Auto-refresh claim status for active claims
  useEffect(() => {
    if (!activeClaim?.claimId || isLoading) {
      return;
    }

    // Only auto-refresh for claims in progress (outcome is "pending")
    // Stop refreshing when claim is completed (claimed) or failed
    const isInProgress = activeClaim.outcome === "pending";

    if (!isInProgress) {
      return;
    }

    // Set up interval to refresh every 12 seconds
    const intervalId = setInterval(() => {
      refreshClaimStatus();
    }, 12000); // 12 seconds

    // Cleanup interval on unmount or when claim changes
    return () => {
      clearInterval(intervalId);
    };
  }, [
    activeClaim?.claimId,
    activeClaim?.outcome,
    isLoading,
    refreshClaimStatus,
  ]);

  const hasActiveClaim = activeClaim !== null;

  const completedStepsCount = activeClaim
    ? Object.values(activeClaim.stepProgress).filter((s) => s === "completed")
        .length
    : 0;

  const canClaimRequests = isNewUser && !hasActiveClaim;

  const claimRequest = useCallback(
    (
      requestId: string,
      sharerCode: string,
      prospect: RequestProspect,
      bountyAmount: number,
      claimerShare: number
    ): boolean => {
      // Validation: only new users without active claims can claim
      if (!isNewUser) {
        return false;
      }
      if (hasActiveClaim) {
        return false;
      }

      const newClaim: ActiveRequestClaim = {
        requestId,
        sharerCode,
        prospect: prospect.name ? prospect : MOCK_PROSPECT,
        bountyAmount: bountyAmount || MOCK_BOUNTY,
        claimerShare: claimerShare || MOCK_CLAIMER_SHARE,
        claimedAt: new Date().toISOString(),
        outcome: "pending",
        stepProgress: {
          signup: "completed", // Auto-completed since they signed up
          linkedin: "pending",
          google: "pending",
          microsoft: "pending",
          verification: "pending",
        },
      };

      setActiveClaim(newClaim);
      // Clear pending claim from session storage
      sessionStorage.removeItem(PENDING_CLAIM_KEY);
      return true;
    },
    [isNewUser, hasActiveClaim]
  );

  const abandonClaim = useCallback(() => {
    setActiveClaim(null);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(PENDING_CLAIM_KEY);
  }, []);

  const updateStepProgress = useCallback(
    (step: keyof ClaimStepProgress, status: ClaimStepStatus) => {
      setActiveClaim((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stepProgress: {
            ...prev.stepProgress,
            [step]: status,
          },
        };
      });
    },
    []
  );

  const setOutcome = useCallback(
    (outcome: ClaimOutcome, notClaimedReason?: string) => {
      setActiveClaim((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          outcome,
          lostReason: outcome === "failed" ? notClaimedReason : undefined,
        };
      });
    },
    []
  );

  // Check for pending claim from session storage (from public request page redirect)
  const checkPendingClaim = useCallback((): ActiveRequestClaim | null => {
    const pending = sessionStorage.getItem(PENDING_CLAIM_KEY);
    if (!pending) return null;

    try {
      const parsed = JSON.parse(pending);
      // Return a partial claim structure for the Dashboard to process
      return {
        requestId: parsed.requestId || parsed.dealId,
        sharerCode: parsed.sharerCode,
        prospect: parsed.prospect?.name ? parsed.prospect : MOCK_PROSPECT,
        bountyAmount: parsed.bountyAmount || MOCK_BOUNTY,
        claimerShare: parsed.claimerShare || MOCK_CLAIMER_SHARE,
        claimedAt: new Date().toISOString(),
        outcome: "pending",
        stepProgress: {
          signup: "completed",
          linkedin: "pending",
          google: "pending",
          microsoft: "pending",
          verification: "pending",
        },
      };
    } catch {
      sessionStorage.removeItem(PENDING_CLAIM_KEY);
      return null;
    }
  }, []);

  // ========== API Integration Methods ==========

  // NOTE: startClaimFromPending removed - claim is now created at OAuth callback

  // Trigger verification after contact import
  const triggerVerification = useCallback(
    async (prospectContactId?: number): Promise<boolean> => {
      if (!activeClaim?.claimId) {
        return false;
      }

      try {
        setIsLoading(true);
        // Update step to show verification in progress
        setActiveClaim((prev) =>
          prev
            ? {
                ...prev,
                stepProgress: {
                  ...prev.stepProgress,
                  verification: "in_progress",
                },
              }
            : prev
        );

        const result = await api.marketplace.verifyClaim({
          claimId: activeClaim.claimId,
          prospectContactId,
        });

        // Update state based on verification result
        setActiveClaim((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            stepProgress: mapBackendStatusToSteps(
              result.status,
              prev.stepProgress
            ),
            outcome: result.verified ? "pending" : "failed",
            lostReason: result.failureReason,
            claimerShare: result.claimerShare ?? prev.claimerShare,
          };
        });

        return result.verified;
      } catch {
        setActiveClaim((prev) =>
          prev
            ? {
                ...prev,
                stepProgress: { ...prev.stepProgress, verification: "failed" },
                outcome: "failed",
                lostReason: "Verification failed",
              }
            : prev
        );
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [activeClaim?.claimId]
  );

  // Complete the claim after verification
  const completeClaimAction = useCallback(async (): Promise<boolean> => {
    if (!activeClaim?.claimId) {
      return false;
    }

    try {
      setIsLoading(true);
      await api.marketplace.completeClaim(activeClaim.claimId);

      analytics.trackIntroMade({
        bountyId: activeClaim.requestId,
        payoutStatus: "paid",
        payoutAmount: activeClaim.bountyAmount,
        currency: "USD",
      });

      // Update state to completed
      setActiveClaim((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stepProgress: {
            signup: "completed",
            linkedin: "completed",
            google: "completed",
            microsoft: "completed",
            verification: "completed",
          },
          outcome: "claimed",
        };
      });

      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [activeClaim?.claimId, activeClaim?.requestId, activeClaim?.bountyAmount]);

  // ========== Dev/Testing Helpers ==========

  // Initialize a demo claim if none exists (for testing UI)
  const initDemoClaimIfNeeded = useCallback(() => {
    if (activeClaim) return; // Already has a claim

    const demoClaim: ActiveRequestClaim = {
      requestId: "demo-request-1",
      sharerCode: "demo-sharer",
      prospect: MOCK_PROSPECT,
      bountyAmount: MOCK_BOUNTY,
      claimerShare: MOCK_CLAIMER_SHARE,
      claimedAt: new Date().toISOString(),
      outcome: "pending",
      stepProgress: {
        signup: "completed",
        linkedin: "pending",
        google: "pending",
        microsoft: "pending",
        verification: "pending",
      },
    };
    setActiveClaim(demoClaim);
  }, [activeClaim]);

  const simulateStepComplete = useCallback((step: keyof ClaimStepProgress) => {
    setActiveClaim((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stepProgress: {
          ...prev.stepProgress,
          [step]: "completed",
        },
      };
    });
  }, []);

  const simulateWin = useCallback(() => {
    setActiveClaim((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        outcome: "claimed",
        stepProgress: {
          signup: "completed",
          linkedin: "completed",
          google: "completed",
          microsoft: "completed",
          verification: "completed",
        },
      };
    });
  }, []);

  const simulateLoss = useCallback((reason: string) => {
    setActiveClaim((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        outcome: "failed",
        lostReason: reason,
        stepProgress: {
          ...prev.stepProgress,
          verification: "failed",
        },
      };
    });
  }, []);

  const resetDemo = useCallback(() => {
    const resetClaim: ActiveRequestClaim = {
      requestId: "demo-request-1",
      sharerCode: "demo-sharer",
      prospect: MOCK_PROSPECT,
      bountyAmount: MOCK_BOUNTY,
      claimerShare: MOCK_CLAIMER_SHARE,
      claimedAt: new Date().toISOString(),
      outcome: "pending",
      stepProgress: {
        signup: "completed",
        linkedin: "pending",
        google: "pending",
        microsoft: "pending",
        verification: "pending",
      },
    };
    setActiveClaim(resetClaim);
  }, []);

  return (
    <RequestClaimContext.Provider
      value={{
        activeClaim,
        hasActiveClaim,
        completedStepsCount,
        isNewUser,
        canClaimRequests,
        isLoading,
        claimRequest,
        abandonClaim,
        updateStepProgress,
        setOutcome,
        checkPendingClaim,
        // API integration
        refreshClaimStatus,
        triggerVerification,
        completeClaim: completeClaimAction,
        // Dev helpers
        simulateStepComplete,
        simulateWin,
        simulateLoss,
        resetDemo,
        initDemoClaimIfNeeded,
      }}
    >
      {children}
    </RequestClaimContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRequestClaim() {
  const context = useContext(RequestClaimContext);
  if (context === undefined) {
    throw new Error(
      "useRequestClaim must be used within a RequestClaimProvider"
    );
  }
  return context;
}
