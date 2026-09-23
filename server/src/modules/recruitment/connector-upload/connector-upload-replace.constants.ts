import { JOB_POOL_MATCH_STATUS } from "../job-pool-matches/job-pool-matches.constants";

/** S3 key prefix written by client `useS3Upload({ folder: "resumes" })`. */
export const CONNECTOR_RESUME_S3_PREFIX = "resumes/";
export const CONNECTOR_RESUME_S3_PATH_PATTERN = /^resumes\/[A-Za-z0-9._-]+$/;

/** Pool-match statuses that cannot receive a resume replace. */
export const REPLACE_BLOCKED_POOL_STATUSES = [
  JOB_POOL_MATCH_STATUS.CONSENT_DECLINED,
  JOB_POOL_MATCH_STATUS.CONSENT_SUPERSEDED,
  JOB_POOL_MATCH_STATUS.CONNECTOR_DECLINED,
  JOB_POOL_MATCH_STATUS.FAILED,
] as const;

/** Recruiter stages that lock resume replace after consent accept. */
export const REPLACE_LOCKED_RECRUITER_STAGES = [
  "shortlisted",
  "interview_invite_sent",
  "interview_scheduled",
  "interview_completed",
  "hired",
  "rejected",
] as const;

/** Recruiter stages where post-accept replace may move the application. */
export const REPLACE_ALLOWED_RECRUITER_STAGES = [
  "in_review",
  "not_qualified",
  "processing",
] as const;
