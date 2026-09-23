import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface WorkingHoursConfig {
  workingHoursStart?: string | null;
  workingHoursEnd?: string | null;
  workingHoursTimezone?: string | null;
}

// Shared with usePipelineFilterConfig so the configuration row is cached once.
export const INTERVIEW_AVAILABILITY_QUERY_KEY = [
  "/api/profiles/me/configuration",
];

/**
 * Reads the current user's saved working hours (start/end/timezone) from
 * user_configurations. Used to pre-fill the interview-invite dialog.
 */
export function useInterviewAvailability(options?: { enabled?: boolean }) {
  const { data, isLoading, error, refetch } = useQuery<WorkingHoursConfig>({
    queryKey: INTERVIEW_AVAILABILITY_QUERY_KEY,
    queryFn: () => api.profiles.getConfiguration(),
    enabled: options?.enabled !== false,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
  });

  return {
    workingHoursStart: data?.workingHoursStart ?? null,
    workingHoursEnd: data?.workingHoursEnd ?? null,
    workingHoursTimezone: data?.workingHoursTimezone ?? null,
    isLoading,
    error,
    refetch,
  };
}
