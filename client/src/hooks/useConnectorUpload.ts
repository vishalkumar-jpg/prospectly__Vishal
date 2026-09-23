import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ConnectorUploadPayload } from "@/lib/api/recruitment";

export function useConnectorUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ConnectorUploadPayload) =>
      api.recruitment.connectorUpload(payload),
    onSuccess: () => {
      // Invalidate inbox queries so new processing entries appear
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/job-pool-matches"],
      });
    },
  });
}
