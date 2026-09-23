import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** On-demand presigned resume URL for a referred connector-pipeline candidate. */
export function useConnectorCandidateResumeUrl(
  candidateId: string | undefined,
  resumeFileName?: string | null
) {
  const query = useQuery({
    queryKey: [
      "/api/recruitment/connector-pipeline/candidate",
      candidateId,
      "resume",
      resumeFileName ?? null,
    ],
    queryFn: () => api.recruitment.getConnectorCandidateResumeUrl(candidateId!),
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
