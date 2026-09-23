import { useQuery } from "@tanstack/react-query";
import { recruiterDashboardApi } from "@/lib/api/recruiter-dashboard";
import type { DashboardPeriodValue } from "../types";
import {
  RECRUITER_DASHBOARD_QUERY_OPTIONS,
  withDashboardQueryState,
} from "./dashboardQuery.utils";

export function useRecruiterCandidateFunnel(
  countries: string[],
  period: DashboardPeriodValue
) {
  return withDashboardQueryState(
    useQuery({
      queryKey: [
        "/api/recruiter/dashboard/candidate-funnel",
        countries,
        period,
      ],
      queryFn: () =>
        recruiterDashboardApi.getCandidateFunnel({ countries, period }),
      ...RECRUITER_DASHBOARD_QUERY_OPTIONS,
    })
  );
}
