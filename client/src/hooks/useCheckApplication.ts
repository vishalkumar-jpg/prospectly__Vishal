import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useCheckApplication(jobId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["/api/recruitment/candidates/check", jobId],
    queryFn: () => api.recruitment.checkApplication(jobId!),
    enabled: !!jobId && enabled,
  });
}
