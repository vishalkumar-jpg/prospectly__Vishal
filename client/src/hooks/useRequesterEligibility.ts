import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";

interface RequesterEligibility {
  canMakeRequest: boolean;
  hasCalendarConnected: boolean;
  calendarProvider: string | null;
  hasPendingFeedback: boolean;
  pendingFeedbackCount: number;
}

export function useRequesterEligibility() {
  const [eligibility, setEligibility] = useState<RequesterEligibility>({
    canMakeRequest: false,
    hasCalendarConnected: false,
    calendarProvider: null,
    hasPendingFeedback: false,
    pendingFeedbackCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const checkEligibility = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Use centralized API request which handles automatic token refresh
      const data = await apiRequest<RequesterEligibility>(
        "/introduction-requests/requester-eligibility"
      );

      setEligibility({
        canMakeRequest: data.canMakeRequest ?? false,
        hasCalendarConnected: data.hasCalendarConnected ?? false,
        calendarProvider: data.calendarProvider ?? null,
        hasPendingFeedback: data.hasPendingFeedback ?? false,
        pendingFeedbackCount: data.pendingFeedbackCount ?? 0,
      });
    } catch {
      setEligibility({
        canMakeRequest: false,
        hasCalendarConnected: false,
        calendarProvider: null,
        hasPendingFeedback: false,
        pendingFeedbackCount: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  return {
    ...eligibility,
    loading,
    refreshEligibility: checkEligibility,
  };
}
