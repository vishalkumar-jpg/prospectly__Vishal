import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";

interface ExistingRequest {
  has_active_request: boolean;
  request_id: string | null;
  requester_name: string | null;
  status: string | null;
  created_at: string | null;
}

interface ClaimResult {
  success: boolean;
  error?: string;
  message: string;
}

export const useIntroductionClaim = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const { user } = useAuth();

  /**
   * Check if a contact already has an active introduction request
   */
  const checkExistingRequest = useCallback(
    async (contactId: number): Promise<ExistingRequest | null> => {
      setIsChecking(true);
      try {
        // Use centralized API request which handles automatic token refresh
        const data = await apiRequest<ExistingRequest>(
          `/introductions/check-existing/${contactId}`
        );

        // If no active request exists
        if (!data || !data.has_active_request) {
          return {
            has_active_request: false,
            request_id: null,
            requester_name: null,
            status: null,
            created_at: null,
          };
        }

        return data;
      } catch {
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    []
  );

  /**
   * Attempt to claim an introduction opportunity
   */
  const claimOpportunity = useCallback(
    async (contactId: number): Promise<ClaimResult | null> => {
      setIsClaiming(true);
      try {
        if (!user) {
          toast.error("You must be logged in to claim opportunities");
          return null;
        }

        // Use centralized API request which handles automatic token refresh and CSRF tokens
        const data = await apiRequest<ClaimResult>("/introductions/claim", {
          method: "POST",
          body: JSON.stringify({
            contactId,
          }),
        });

        if (!data.success) {
          toast.error(
            data.message || data.error || "Failed to claim opportunity"
          );
          return data;
        }

        return data;
      } catch {
        toast.error("An error occurred while claiming the opportunity");
        return null;
      } finally {
        setIsClaiming(false);
      }
    },
    [user]
  );

  /**
   * Log when a user views or abandons an opportunity (for analytics)
   */
  const logOpportunityAction = useCallback(
    async (
      contactId: number,
      action: "viewed" | "claimed" | "abandoned",
      metadata?: Record<string, unknown>
    ) => {
      try {
        if (!user) return;

        // Use centralized API request which handles automatic token refresh and CSRF tokens
        await apiRequest("/analytics/opportunity-action", {
          method: "POST",
          body: JSON.stringify({
            contactId,
            action,
            metadata: metadata || {},
          }),
        });
      } catch {
        // Silent fail for analytics
      }
    },
    [user]
  );

  return {
    checkExistingRequest,
    claimOpportunity,
    logOpportunityAction,
    isChecking,
    isClaiming,
  };
};
