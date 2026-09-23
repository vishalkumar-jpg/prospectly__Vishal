import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ConnectorReplaceResumePayload } from "@/lib/api/recruitment";

export function useReplaceConnectorResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ConnectorReplaceResumePayload) =>
      api.recruitment.replaceConnectorResume(payload),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/job-pool-matches"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/connector-pipeline"],
      });
      queryClient.invalidateQueries({
        queryKey: ["connector-job-board"],
      });

      if (payload.candidateId) {
        queryClient.invalidateQueries({
          queryKey: [
            "/api/recruitment/connector-pipeline/candidate",
            payload.candidateId,
          ],
        });
        queryClient.removeQueries({
          queryKey: [
            "/api/recruitment/connector-pipeline/candidate",
            payload.candidateId,
            "resume",
          ],
        });
      }

      if (payload.matchId) {
        queryClient.invalidateQueries({
          queryKey: [
            "/api/recruitment/connector-pipeline/match",
            payload.matchId,
          ],
        });
        queryClient.removeQueries({
          queryKey: [
            "/api/recruitment/job-pool-matches",
            payload.matchId,
            "resume",
          ],
        });
      }
    },
  });
}
