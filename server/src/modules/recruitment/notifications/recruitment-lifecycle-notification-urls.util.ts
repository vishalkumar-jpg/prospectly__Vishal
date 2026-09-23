import { appConfig } from "config/app.config";

export const buildRecruiterPipelineUrl = (
  jobId: string,
  candidateId?: string
): string => {
  const base = `${appConfig.frontendUrl}/recruiting/my-job-posts/${jobId}`;
  return candidateId ? `${base}?candidate=${candidateId}` : base;
};

export const buildConnectorPipelineUrl = (_candidateId?: string): string =>
  `${appConfig.frontendUrl}/recruiting/refer-candidates/inbox`;

export const buildCandidateApplicationsUrl = (): string =>
  `${appConfig.frontendUrl}/recruiting/my-applications`;

export const buildJobMarketplaceUrl = (): string =>
  `${appConfig.frontendUrl}/recruiting/job-marketplace`;

/** Profile email preferences — used for closed-job “opt out here” link. */
export const buildEmailPreferencesUrl = (): string =>
  `${appConfig.frontendUrl}/profile/preferences`;

export const PAYOUT_SETTINGS_QUERY_PARAM = "openPayoutSettings";

export const buildStripeSetupUrl = (): string =>
  `${appConfig.frontendUrl}/dashboard?${PAYOUT_SETTINGS_QUERY_PARAM}=1`;
