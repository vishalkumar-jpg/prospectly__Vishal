/** Sentinel value for notifying candidates in every eligible close-notify stage. */
export const JOB_CLOSE_NOTIFY_ALL_STAGES = "all" as const;

/** Candidate stages offered when closing a job (excluding hired/rejected). */
export const JOB_CLOSE_CANDIDATE_STAGE_KEYS = [
  "in_review",
  "not_qualified",
  "shortlisted",
  "interview_invite_sent",
  "interview_scheduled",
  "interview_completed",
] as const;

export type JobCloseCandidateStageKey =
  (typeof JOB_CLOSE_CANDIDATE_STAGE_KEYS)[number];

export const JOB_CLOSE_CANDIDATE_STAGE_OPTIONS = [
  JOB_CLOSE_NOTIFY_ALL_STAGES,
  ...JOB_CLOSE_CANDIDATE_STAGE_KEYS,
] as const;

export interface JobClosedNotificationJobData {
  jobId: string;
  closedByUserId: string;
  closeReason: string;
  /** Empty = connectors only. Includes `all` or specific stage keys. */
  candidateStageKeys: string[];
}
