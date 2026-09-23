import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MarkInterviewOutcomePayload } from "@/lib/api/recruitment";
import { toast } from "./use-toast";

const JOB_CANDIDATES_KEY = "/api/recruitment/candidates/job";

export function useMarkInterviewOutcome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      candidateId,
      payload,
    }: {
      candidateId: string;
      payload: MarkInterviewOutcomePayload;
    }) => api.recruitment.markInterviewOutcome(candidateId, payload),
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
        title: "Failed to mark interview outcome",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    },
  });
}
