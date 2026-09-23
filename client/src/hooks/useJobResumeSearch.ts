import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ResumeSearchMatch } from "@/lib/api/recruitment";
import { RESUME_SEARCH_MIN_QUERY_LENGTH } from "@/lib/recruitment/resume-search.utils";

/**
 * Deliberately NOT prefixed with "/api/recruitment/candidates/job".
 * JobDetailWithKanban refetches and invalidates that prefix after every board
 * mutation, and TanStack matches by prefix — a sibling key would re-POST this
 * search (and pay for another embedding) on every refresh and stage change.
 */
export const JOB_RESUME_SEARCH_QUERY_KEY =
  "/api/recruitment/candidates/job-resume-search";

/** Stable identity so consumers memoising on it don't rerender every fetch. */
const EMPTY_CONSTRAINTS: string[] = [];

/**
 * Which board is asking. The two hit different endpoints with different row
 * scoping, so the scope is part of the cache key — without it the recruiter and
 * connector views of the same job would serve each other's results.
 */
export type ResumeSearchScope = "recruiter" | "connector";

export function useJobResumeSearch(
  jobId: string | undefined,
  query: string,
  scope: ResumeSearchScope = "recruiter"
) {
  const normalized = query.trim();
  const enabled =
    !!jobId && normalized.length >= RESUME_SEARCH_MIN_QUERY_LENGTH;

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: [JOB_RESUME_SEARCH_QUERY_KEY, scope, jobId, normalized],
    queryFn: () =>
      scope === "connector"
        ? api.recruitment.searchConnectorJobResumes(jobId!, normalized)
        : api.recruitment.searchJobCandidateResumes(jobId!, normalized),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    // A POST that costs an embedding call — never refire it implicitly.
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
    // Keeps the board populated while a new query is in flight.
    placeholderData: (previous) => previous,
  });

  /**
   * A disabled query still serves placeholderData: TanStack's placeholder
   * branch keys off `status === "pending" && data === undefined`, which is
   * exactly what a disabled query looks like, and it keeps the last defined
   * data for as long as the observer is mounted. Clearing the search box would
   * otherwise leave the previous results attached to the board's cards until a
   * reload. Gate once here so no consumer can leak stale state.
   */
  const result = enabled ? data : undefined;

  const matchById = useMemo(
    () =>
      new Map<string, ResumeSearchMatch>(
        (result?.matches ?? []).map((match) => [match.candidateId, match])
      ),
    [result]
  );

  const topScore = result?.matches[0]?.score ?? 0;

  return {
    isActive: enabled,
    matchById,
    topScore,
    /** The query these results belong to — may lag `query` mid-flight. */
    resolvedQuery: result?.query ?? "",
    matchCount: result?.matches.length ?? 0,
    totalCandidates: result?.totalCandidates ?? 0,
    indexedCandidates: result?.indexedCandidates ?? 0,
    degraded: result?.degraded ?? false,
    truncated: result?.truncated ?? false,
    constraints: result?.constraints ?? EMPTY_CONSTRAINTS,
    plannerUnavailable: result?.plannerUnavailable ?? false,
    unknownExperienceCount: result?.unknownExperienceCount ?? 0,
    exactMatchCount: result?.exactMatchCount ?? 0,
    loading: enabled && isFetching,
    error: enabled ? error : null,
    refetch,
  } as const;
}
