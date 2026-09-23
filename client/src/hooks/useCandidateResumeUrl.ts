import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Fetches a short-lived presigned URL for a candidate's original resume — but
 * only on demand. The query is disabled by default so merely opening the
 * candidate modal does NOT hit the endpoint; call `fetchResumeUrl()` when the
 * user actually acts (Preview / Open) to mint a fresh URL. The result is cached
 * per candidate (`queryKey`) so a follow-up action reuses it without a second
 * request, and switching candidates resets it.
 */
export function useCandidateResumeUrl(candidateId: string | undefined) {
  const query = useQuery({
    queryKey: ["/api/recruitment/candidates", candidateId, "resume"],
    queryFn: () => api.recruitment.getResumeUrl(candidateId!),
    enabled: false,
    staleTime: 8 * 60 * 1000,
  });

  const { refetch } = query;
  const fetchResumeUrl = useCallback(async (): Promise<string | null> => {
    const res = await refetch();
    return res.data?.url ?? null;
  }, [refetch]);

  return {
    resumeUrl: query.data?.url ?? null,
    resumeFileName: query.data?.fileName ?? null,
    loading: query.isFetching,
    error: query.error,
    fetchResumeUrl,
  };
}
