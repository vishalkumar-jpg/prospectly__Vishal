import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type ArchiveRequesterIntroductionPayload = {
  requestId: string;
  archiveReason: string;
  archiveNotes: string;
};

export function useArchiveRequesterIntroduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      archiveReason,
      archiveNotes,
    }: ArchiveRequesterIntroductionPayload) =>
      api.archive.archiveRequesterIntroduction(requestId, {
        archiveReason,
        archiveNotes,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["/api/requester/introduction-requests/pipeline"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["/api/requester/introduction-requests/stats"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["/api/requester/introduction-requests/archive"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["/api/marketplace/browse"],
      });
    },
  });
}
