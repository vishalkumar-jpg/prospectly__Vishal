import { useQuery } from "@tanstack/react-query";
import { recruiterDashboardApi } from "@/lib/api/recruiter-dashboard";
import {
  RECRUITER_DASHBOARD_QUERY_OPTIONS,
  withDashboardQueryState,
} from "./dashboardQuery.utils";

export function useRecruiterPayoutsDue(countries: string[]) {
  return withDashboardQueryState(
    useQuery({
      queryKey: ["/api/recruiter/dashboard/payouts-due", countries],
      queryFn: () => recruiterDashboardApi.getPayoutsDue({ countries }),
      ...RECRUITER_DASHBOARD_QUERY_OPTIONS,
    })
  );
}
