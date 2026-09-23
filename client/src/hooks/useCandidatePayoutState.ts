import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CandidatePayoutState } from "@/lib/api/recruitment";

// Drives both Release Payout and Edit Classification dialogs. Fetched lazily
// when a dialog opens (gate via `enabled`) so we don't pay the round-trip on
// every kanban card render.
export const CANDIDATE_PAYOUT_STATE_KEY = "/api/recruitment/payout/state";

export function useCandidatePayoutState(
  candidateId: string | null,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  const { data, isLoading, error, refetch } = useQuery<CandidatePayoutState>({
    queryKey: [CANDIDATE_PAYOUT_STATE_KEY, candidateId],
    queryFn: () => api.recruitment.getCandidatePayoutState(candidateId!),
    enabled: enabled && !!candidateId,
    refetchOnMount: "always",
  });

  return {
    state: data ?? null,
    loading: isLoading,
    error,
    refetch,
  };
}
