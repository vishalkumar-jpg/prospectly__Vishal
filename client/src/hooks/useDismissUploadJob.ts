import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useDismissUploadJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uploadJobId: string) =>
      api.recruitment.dismissUploadJob(uploadJobId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/job-pool-matches"],
      });
    },
  });
}
