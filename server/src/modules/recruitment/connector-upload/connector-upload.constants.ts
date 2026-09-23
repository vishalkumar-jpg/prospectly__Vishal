export const CONNECTOR_UPLOAD_QUEUE_NAME = "connector-resume-upload";

export const CONNECTOR_UPLOAD_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 15000,
    },
    removeOnComplete: {
      age: 7 * 24 * 60 * 60,
      count: 200,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60,
    },
  },
};

export const CONNECTOR_UPLOAD_QUEUE_JOBS = {
  PROCESS_RESUME: "process-connector-resume",
  REPLACE_RESUME: "replace-connector-resume",
} as const;

export const MAX_UPLOAD_JOB_RETRIES = 5;

/** Resume-upload auto-flow: score >= this → auto consent email; below → Not Qualified. */
export const CONNECTOR_UPLOAD_AUTO_CONSENT_MIN_SCORE = 50;

export const UPLOAD_JOB_STATUS = {
  QUEUED: "queued",
  PROCESSING: "processing",
  FAILED: "failed",
  COMPLETED: "completed",
} as const;

export type UploadJobStatus =
  (typeof UPLOAD_JOB_STATUS)[keyof typeof UPLOAD_JOB_STATUS];

export const UPLOAD_JOB_FAILURE_REASON = {
  NO_CONTACT_INFO: "no_contact_info",
  INVALID_PDF: "invalid_pdf",
  FILE_TOO_LARGE: "file_too_large",
  AI_EXTRACTION_FAILED: "ai_extraction_failed",
  CONTACT_CREATION_FAILED: "contact_creation_failed",
  EVALUATION_FAILED: "evaluation_failed",
  MISSING_CANDIDATE: "missing_candidate",
  UNKNOWN: "unknown",
} as const;

export type UploadJobFailureReason =
  (typeof UPLOAD_JOB_FAILURE_REASON)[keyof typeof UPLOAD_JOB_FAILURE_REASON];

export const CONNECTOR_UPLOAD_MESSAGES = {
  SUCCESS: {
    QUEUED: "Resumes queued for processing",
    REPLACE_QUEUED: "Resume update queued for analysis",
  },
  ERROR: {
    UPLOAD_JOB_NOT_FOUND: "Upload job not found",
    UPLOAD_JOB_NOT_FAILED: "Only failed uploads can be retried",
    UPLOAD_JOB_MAX_RETRIES: "Maximum retry attempts reached",
    UPLOAD_JOB_CANNOT_DISMISS:
      "Only failed or completed uploads can be dismissed",
    JOB_NOT_FOUND: "Job not found or is no longer active",
    PII_CONSENT_REQUIRED: "PII consent acknowledgment is required",
    NO_FILES: "At least one resume file is required",
    TOO_MANY_FILES: "Maximum 10 resume files allowed per upload",
    MISSING_CONTACT_INFO:
      "Could not extract contact information (email, phone, or LinkedIn) from resume",
    MISSING_CANDIDATE_NAME: "Could not extract candidate name from resume",
    INVALID_PDF:
      "Invalid or unsupported file format. Only PDF files are accepted",
    FILE_TOO_LARGE: "File exceeds maximum size of 10MB",
    EXTRACTION_FAILED: "Failed to extract information from resume",
    EVALUATION_FAILED: "Failed to evaluate resume against job description",
    CONTACT_CREATION_FAILED: "Failed to create contact record",
    INVALID_EMAIL: "Invalid email address",
    DISPOSABLE_EMAIL: "Disposable email addresses are not allowed",
    DUPLICATE_EMAIL: "Duplicate email detected in the same upload",
    ALREADY_REFERRED_BY_YOU:
      "You have already uploaded a resume for this email on this job",
    CANDIDATE_ALREADY_APPLIED: "This candidate has already applied to this job",
    CANDIDATE_ALREADY_CLAIMED:
      "This candidate has already accepted another connector for this job",
    CONNECTOR_BLOCKED_BY_CANDIDATE:
      "This candidate indicated they do not know you. You cannot refer them to any job.",
    REPLACE_TARGET_REQUIRED: "Either matchId or candidateId is required",
    MATCH_NOT_FOUND: "Referral not found or you do not have access",
    CANDIDATE_NOT_FOUND: "Candidate not found or you do not have access",
    REPLACE_NO_RESUME: "Only uploaded referrals can have their resume updated",
    REPLACE_STATUS_BLOCKED:
      "Resume cannot be updated in the current referral status",
    REPLACE_ANALYSIS_IN_FLIGHT:
      "A resume analysis is already in progress for this referral",
    REPLACE_STAGE_LOCKED:
      "Resume cannot be updated after the candidate has been shortlisted",
  },
} as const;

export const DISPOSABLE_EMAIL_DOMAINS: readonly string[] = [
  "mailinator.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "guerrillamail.com",
  "throwawaymail.com",
  "yopmail.com",
  "trashmail.com",
  "fakeinbox.com",
  "getnada.com",
  "maildrop.cc",
  "sharklasers.com",
  "dispostable.com",
  "mintemail.com",
];

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}
