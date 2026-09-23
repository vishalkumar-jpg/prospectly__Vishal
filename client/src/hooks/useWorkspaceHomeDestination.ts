import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceFocus } from "@/hooks/useWorkspaceFocus";
import { api } from "@/lib/api";
import {
  resolveWorkspaceHomeDestination,
  type WorkspaceHomeDestination,
} from "@/lib/workspace-home";
import type { PrimaryWorkspace } from "@/lib/workspace-focus";

const JOB_STATS_KEY = "/api/recruitment/jobs/stats";

const RECRUITING_ACTIVITY_QUERY_OPTIONS = {
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: true,
};

type RecruitingHomeActivity = {
  hasPostedJobs: boolean;
  hasConfirmedNoPostedJobs: boolean;
  jobsStatsResolved: boolean;
};

function activityFromJobStats(
  jobStats: { totalJobs: number } | undefined,
): Pick<RecruitingHomeActivity, "hasPostedJobs"> {
  return {
    hasPostedJobs: (jobStats?.totalJobs ?? 0) > 0,
  };
}

/** Flags for recruiting home routing (posted jobs / collaborator access). */
export function useRecruitingHomeActivity(enabled: boolean) {
  const queryClient = useQueryClient();

  const {
    data: jobStats,
    isLoading: jobsLoading,
    isError: jobsError,
  } = useQuery({
    queryKey: [JOB_STATS_KEY],
    queryFn: () => api.recruitment.getJobStats(),
    enabled,
    ...RECRUITING_ACTIVITY_QUERY_OPTIONS,
  });

  const ensureResolved = useCallback(async (): Promise<
    Pick<RecruitingHomeActivity, "hasPostedJobs">
  > => {
    if (!enabled) {
      return { hasPostedJobs: false };
    }
    const resolvedJobs = await queryClient.fetchQuery({
      queryKey: [JOB_STATS_KEY],
      queryFn: () => api.recruitment.getJobStats(),
      ...RECRUITING_ACTIVITY_QUERY_OPTIONS,
    });
    return activityFromJobStats(resolvedJobs);
  }, [enabled, queryClient]);

  const jobsStatsResolved =
    !enabled || (!jobsLoading && (jobStats !== undefined || jobsError));
  const hasConfirmedNoPostedJobs =
    enabled &&
    !jobsLoading &&
    !jobsError &&
    jobStats !== undefined &&
    jobStats.totalJobs === 0;

  return {
    ...activityFromJobStats(jobStats),
    hasConfirmedNoPostedJobs,
    jobsStatsResolved,
    isLoading: enabled && jobsLoading,
    ensureResolved,
  };
}

type Options = {
  /** Override focus (e.g. Getting Started draft primary). */
  primaryOverride?: PrimaryWorkspace;
  /** When false, skip recruiting activity fetches. */
  enabled?: boolean;
};

/**
 * Resolves path + CTA label for the user's active (or overridden) primary workspace.
 */
export function useWorkspaceHomeDestination(
  options: Options = {},
): WorkspaceHomeDestination & {
  isLoading: boolean;
  hasPostedJobs: boolean;
  hasConfirmedNoPostedJobs: boolean;
  jobsStatsResolved: boolean;
} {
  const { user } = useAuth();
  const { focus, canAccessRecruiting } = useWorkspaceFocus();
  const primary = options.primaryOverride ?? focus;
  const enabled = (options.enabled ?? true) && !!user;

  const activity = useRecruitingHomeActivity(
    enabled && canAccessRecruiting && primary === "recruiting",
  );

  const destination = useMemo(
    () =>
      resolveWorkspaceHomeDestination({
        primary,
        hasPostedJobs: activity.hasPostedJobs,
      }),
    [primary, activity.hasPostedJobs],
  );

  return {
    ...destination,
    hasPostedJobs: activity.hasPostedJobs,
    hasConfirmedNoPostedJobs: activity.hasConfirmedNoPostedJobs,
    jobsStatsResolved: activity.jobsStatsResolved,
    isLoading: activity.isLoading,
  };
}
