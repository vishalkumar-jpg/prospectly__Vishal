export const POST_A_JOB_PATH = "/recruiting/post-a-job" as const;
export const RECRUITER_DASHBOARD_PATH = "/recruiter/dashboard" as const;
export const CANDIDATE_SEARCH_PATH = "/recruiting/candidates" as const;

export function candidateSearchDetailPath(candidateId: string): string {
  return `${CANDIDATE_SEARCH_PATH}/${candidateId}`;
}
