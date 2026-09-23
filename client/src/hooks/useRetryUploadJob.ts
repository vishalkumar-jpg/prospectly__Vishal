import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useRetryUploadJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uploadJobId: string) =>
      api.recruitment.retryUploadJob(uploadJobId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/job-pool-matches"],
      });
    },
  });
}
