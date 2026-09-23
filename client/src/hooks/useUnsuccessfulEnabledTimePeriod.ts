import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api/core";
import { parseUnsuccessfulEnabledTimePeriodDays } from "@/utils/unsuccessfulTimeGate";

const QUERY_KEY = ["system-configuration", "unsuccessful_enabled_time_period"] as const;

export function useUnsuccessfulEnabledTimePeriod() {
  const { data: periodDays = 0 } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      try {
        const config = await api.systemConfiguration.getBySlug(
          "unsuccessful_enabled_time_period"
        );
        return parseUnsuccessfulEnabledTimePeriodDays(config?.value);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return 0;
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return periodDays;
}
