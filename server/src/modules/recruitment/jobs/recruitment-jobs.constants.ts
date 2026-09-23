/** Max entries per list on create (required vs preferred skills). */
export const JOB_SKILLS_PER_LIST_MAX = 50;

/** Salary is informational job data (no payment) — allow large CTCs, e.g. Indian LPA packages. */
export const SALARY_MAX_CAP = 999_999_999;
export const SUCCESS_FEE_MAX = 999999;
export const PROBATION_PERIOD_MAX_DAYS = 365;
/** Max connector payout waiting period (days from hire date). 0/blank = pay right away. */
export const CONNECTOR_PAYOUT_WAIT_MAX_DAYS = 365;

export const RECRUITMENT_JOBS_MESSAGES = {
  ERROR: {
    CREATE_FAILED: "Failed to create recruitment job",
    FETCH_FAILED: "Failed to fetch recruitment jobs",
    FETCH_STATS_FAILED: "Failed to fetch recruitment job stats",
    PROFILE_NOT_FOUND: "User profile not found",
    NO_PAYMENT_METHOD:
      "Please add a payment method before publishing a job post",
    NO_CALENDAR_CONNECTED:
      "You must connect a calendar (Google or Microsoft) before publishing a job post.",
    SALARY_RANGE_INVALID: "Maximum salary must be greater than minimum salary",
    SALARY_RANGE_INCOMPLETE:
      "Both minimum and maximum salary are required when providing a salary range",
    JOB_NOT_FOUND: "Recruitment job not found",
    UPDATE_FAILED: "Failed to update recruitment job",
    UNAUTHORIZED_UPDATE: "You are not authorized to update this job",
    CLOSE_FAILED: "Failed to close recruitment job",
    ALREADY_CLOSED: "This job has already been closed",
    NOT_CLOSED: "Only closed jobs can be reopened",
    REOPEN_OWNER_ONLY: "Only the job owner can reopen a closed job",
    SUCCESS_FEE_AMOUNT_REQUIRED:
      "Success Fee Amount is required when Success Fees are applied",
    SUCCESS_FEE_EDIT_CLOSED_JOB:
      "The Success Fee cannot be changed on a closed job",
    FLAT_REFERRAL_AMOUNT_REQUIRED:
      "Flat Referral Fee is required for the Flat Referral Model",
    FLAT_FEE_EDIT_CLOSED_JOB:
      "The Flat Referral Fee cannot be changed on a closed job",
    CONNECTOR_PAYOUT_EDIT_CLOSED_JOB:
      "Connector payout timing cannot be changed on a closed job",
    CONNECTOR_PAYOUT_WAIT_DAYS_REQUIRED:
      "A waiting period of at least 1 day is required when a connector type waits",
  },
  SUCCESS: {
    CREATED: "Recruitment job created successfully",
    UPDATED: "Recruitment job updated successfully",
    CLOSED: "Recruitment job closed successfully",
    REOPENED: "Recruitment job reopened successfully",
  },
} as const;
