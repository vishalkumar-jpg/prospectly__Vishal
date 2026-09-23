import { useQuery } from "@tanstack/react-query";
import { recruiterDashboardApi } from "@/lib/api/recruiter-dashboard";
import {
  RECRUITER_DASHBOARD_QUERY_OPTIONS,
  withDashboardQueryState,
} from "./dashboardQuery.utils";

export function useRecruiterDashboardSummary(countries: string[]) {
  return withDashboardQueryState(
    useQuery({
      queryKey: ["/api/recruiter/dashboard/summary", countries],
      queryFn: () => recruiterDashboardApi.getSummary({ countries }),
      ...RECRUITER_DASHBOARD_QUERY_OPTIONS,
    })
  );
}
