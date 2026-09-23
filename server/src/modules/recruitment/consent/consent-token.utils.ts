import { JOB_POOL_MATCH_STATUS } from "modules/recruitment/job-pool-matches/job-pool-matches.constants";

type MatchWithConsentToken = {
  status: string;
  consentToken: string | null;
};

/** True when a newer consent email replaced this JWT link. */
export function isSupersededConsentToken(
  match: MatchWithConsentToken,
  token: string
): boolean {
  return (
    match.status === JOB_POOL_MATCH_STATUS.CONSENT_PENDING &&
    !!match.consentToken &&
    match.consentToken !== token
  );
}
