import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { ApplyToJobPayload } from "@/lib/api/recruitment";

export function useApplyToJob() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  return useMutation({
    mutationFn: (payload: ApplyToJobPayload) =>
      api.recruitment.applyToJob(payload),
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/candidates/check", variables.jobId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/candidates/job"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/my-applications"],
      });

      // Applying persists the payout country, so both copies of it the
      // completion gate reads are now stale. Awaited so the refresh lands
      // before the modal unmounts and the gate re-evaluates.
      queryClient.invalidateQueries({ queryKey: ["profile-completion"] });
      await refreshUser();
    },
  });
}
