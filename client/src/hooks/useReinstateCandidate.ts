import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ReinstateCandidatePayload,
  ReinstateOptionsResponse,
} from "@/lib/api/recruitment";

const JOB_CANDIDATES_KEY = "/api/recruitment/candidates/job";
const REINSTATE_OPTIONS_KEY =
  "/api/recruitment/candidate-workflow/reinstate-options";

/**
 * Server-derived list of stages a rejected candidate may be moved back to.
 *
 * The client MUST NOT compute this list — the server derives it from the
 * candidate's own `recruitment_candidate_stage_history` so a stage the
 * candidate never reached can never be offered. Pass `null` to keep it idle
 * (the dialog only fetches while it is open).
 */
export function useReinstateOptions(candidateId: string | null) {
  return useQuery<ReinstateOptionsResponse>({
    queryKey: [REINSTATE_OPTIONS_KEY, candidateId],
    queryFn: () => api.recruitment.getReinstateOptions(candidateId as string),
    enabled: !!candidateId,
    // Options depend on live stage history — don't serve a stale allow-list.
    staleTime: 0,
  });
}

/**
 * Moves a rejected candidate back to an earlier stage.
 *
 * No payment is involved: reinstating neither charges nor refunds. The
 * referral fee is still only captured when the candidate reaches Hired.
 */
export function useReinstateCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      candidateId,
      payload,
    }: {
      candidateId: string;
      payload: ReinstateCandidatePayload;
    }) => api.recruitment.reinstateCandidate(candidateId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [JOB_CANDIDATES_KEY] });
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/candidates", variables.candidateId],
      });
      queryClient.invalidateQueries({
        queryKey: [REINSTATE_OPTIONS_KEY, variables.candidateId],
      });
    },
  });
}
