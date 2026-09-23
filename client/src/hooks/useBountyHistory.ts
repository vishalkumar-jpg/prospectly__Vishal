import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";

export interface BountyStageHistoryEntry {
  id: string;
  stage_id: string;
  stage_title: string;
  old_percentage: number | null;
  new_percentage: number;
  changed_by: string | null;
  changed_at: string;
  change_reason: string | null;
}

export function useBountyHistory() {
  const [history, setHistory] = useState<BountyStageHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use centralized API request which handles automatic token refresh
      const data =
        await apiRequest<BountyStageHistoryEntry[]>("/bounties/history");
      setHistory(data || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch bounty history";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    history,
    loading,
    error,
    fetchHistory,
  };
}
