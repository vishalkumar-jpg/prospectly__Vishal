import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useRetryCandidateEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (candidateId: string) =>
      api.recruitment.retryCandidateEvaluation(candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/my-applications"],
      });
    },
  });
}
