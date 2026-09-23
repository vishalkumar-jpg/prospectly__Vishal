import type { QueryClient } from "@tanstack/react-query";

/** Refresh refer/share counts after connector upload or job share actions. */
export function invalidateConnectorEngagementQueries(
  queryClient: QueryClient
): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["/api/recruitment/marketplace"],
    }),
    queryClient.invalidateQueries({
      queryKey: ["/api/recruitment/job-pool-matches"],
    }),
    queryClient.invalidateQueries({
      queryKey: ["connector-job-board"],
    }),
    queryClient.invalidateQueries({
      queryKey: ["/api/recruitment/marketplace/my-job-shares"],
    }),
  ]).then(() => undefined);
}
