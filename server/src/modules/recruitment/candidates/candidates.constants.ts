export const CANDIDATES_MESSAGES = {
  ERROR: {
    JOB_NOT_FOUND: "Job not found or no longer active",
    INVALID_SHARER_CODE: "Invalid referrer code for this job",
    SELF_APPLICATION: "You cannot apply to your own job posting",
    ALREADY_APPLIED: "You have already applied to this job",
    NOT_JOB_OWNER: "You are not authorized to view candidates for this job",
    CANDIDATE_NOT_FOUND: "Candidate not found",
    RESUME_NOT_AVAILABLE: "Resume not available",
    APPLY_FAILED: "Failed to submit application",
  },
  SUCCESS: {
    APPLIED: "Application submitted successfully",
  },
} as const;

/**
 * TTL for a presigned resume GET URL. Short-lived (10 min) — long enough to open
 * and read the PDF, short enough to limit exposure if the URL leaks.
 */
export const CANDIDATE_RESUME_URL_TTL_SECONDS = 600;
