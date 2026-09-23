import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { RejectCandidatePayload } from "@/lib/api/recruitment";
import { toast } from "./use-toast";

const JOB_CANDIDATES_KEY = "/api/recruitment/candidates/job";

export function useRejectCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      candidateId,
      payload,
    }: {
      candidateId: string;
      payload: RejectCandidatePayload;
    }) => api.recruitment.rejectCandidate(candidateId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [JOB_CANDIDATES_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/candidates", variables.candidateId],
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to reject candidate",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    },
  });
}
