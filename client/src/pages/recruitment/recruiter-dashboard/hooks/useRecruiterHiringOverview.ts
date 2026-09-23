import { useQuery } from "@tanstack/react-query";
import { recruiterDashboardApi } from "@/lib/api/recruiter-dashboard";
import type { DashboardPeriodValue } from "../types";
import {
  RECRUITER_DASHBOARD_QUERY_OPTIONS,
  withDashboardQueryState,
} from "./dashboardQuery.utils";

export function useRecruiterHiringOverview(
  countries: string[],
  period: DashboardPeriodValue
) {
  return withDashboardQueryState(
    useQuery({
      queryKey: ["/api/recruiter/dashboard/hiring-overview", countries, period],
      queryFn: () =>
        recruiterDashboardApi.getHiringOverview({ countries, period }),
      ...RECRUITER_DASHBOARD_QUERY_OPTIONS,
    })
  );
}
