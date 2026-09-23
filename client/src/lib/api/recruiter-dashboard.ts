import { getCountriesQueryValue } from "@/lib/recruitment/country-filter.utils";
import { request } from "./core";
import type {
  RecruiterCandidateFunnelResponse,
  RecruiterDashboardSummaryResponse,
  RecruiterHiringOverviewResponse,
  RecruiterPayoutsDueResponse,
} from "@/pages/recruitment/recruiter-dashboard/types";

type DashboardQuery = {
  countries?: string[];
};

type PeriodQuery = DashboardQuery & {
  period?: string;
};

function buildQuery(params: DashboardQuery | PeriodQuery): string {
  const search = new URLSearchParams();
  const countries = params.countries
    ? getCountriesQueryValue(params.countries)
    : null;
  if (countries) {
    search.set("countries", countries);
  }
  if ("period" in params && params.period) {
    search.set("period", params.period);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const recruiterDashboardApi = {
  getSummary: (params: DashboardQuery = {}) =>
    request<RecruiterDashboardSummaryResponse>(
      `/recruiter/dashboard/summary${buildQuery(params)}`
    ),

  getHiringOverview: (params: PeriodQuery = {}) =>
    request<RecruiterHiringOverviewResponse>(
      `/recruiter/dashboard/hiring-overview${buildQuery(params)}`
    ),

  getCandidateFunnel: (params: PeriodQuery = {}) =>
    request<RecruiterCandidateFunnelResponse>(
      `/recruiter/dashboard/candidate-funnel${buildQuery(params)}`
    ),

  getPayoutsDue: (params: DashboardQuery = {}) =>
    request<RecruiterPayoutsDueResponse>(
      `/recruiter/dashboard/payouts-due${buildQuery(params)}`
    ),
};
