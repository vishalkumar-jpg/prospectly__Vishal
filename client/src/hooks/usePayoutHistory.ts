import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";

export interface PayoutHistoryItem {
  id: string;
  amount: number;
  status: "completed" | "pending" | "processing" | "failed";
  created_at: string;
  completed_at?: string;
  stripe_payout_id?: string;
  error_message?: string;
  bank_account_last4?: string;
}

export function usePayoutHistory() {
  const [payouts, setPayouts] = useState<PayoutHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchPayouts = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Use centralized API request which handles automatic token refresh
      const data = await apiRequest<{ payouts: PayoutHistoryItem[] }>(
        "/finances/payouts"
      );
      setPayouts(data.payouts || []);
    } catch {
      toast.error("Failed to load payout history");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  return {
    payouts,
    loading,
    refetch: fetchPayouts,
  };
}
