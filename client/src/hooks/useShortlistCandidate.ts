import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "./use-toast";

const JOB_CANDIDATES_KEY = "/api/recruitment/candidates/job";

export function useShortlistBreakdown(candidateId: string | null | undefined) {
  return useQuery({
    queryKey: ["shortlist-breakdown", candidateId],
    queryFn: () => api.recruitment.getShortlistBreakdown(candidateId!),
    enabled: !!candidateId,
    // This is a live money figure that changes as pipeline actions occur (e.g.
    // another candidate on the job gets hired, or the fee is edited). Override
    // the global 5-minute staleTime so every dialog open fetches fresh instead
    // of serving a stale "amount due at hire" from cache. gcTime: 0 drops the
    // entry once no dialog observes it, so the next open starts from a loading
    // state (no stale number flashes) rather than a cached value.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });
}

export function useShortlistCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (candidateId: string) =>
      api.recruitment.shortlistCandidate(candidateId),
    onSuccess: (_data, candidateId) => {
      queryClient.invalidateQueries({
        queryKey: [JOB_CANDIDATES_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/candidates", candidateId],
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to shortlist candidate",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    },
  });
}
