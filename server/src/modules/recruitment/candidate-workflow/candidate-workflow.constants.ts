export const REJECTION_CATEGORIES = [
  "Not a fit",
  "Position filled",
  "Insufficient experience",
  "Overqualified",
  "Cultural mismatch",
  "Salary expectations",
  "Other",
] as const;

export type RejectionCategory = (typeof REJECTION_CATEGORIES)[number];

export const CANDIDATE_WORKFLOW_MESSAGES = {
  ERROR: {
    ALREADY_REJECTED: "This candidate has already been rejected",
    REJECT_FAILED: "Failed to reject the candidate",
    INVALID_REJECTION_CATEGORY: "Invalid rejection category",
    CANDIDATE_NOT_FOUND: "Candidate not found",
    NOT_JOB_OWNER: "You are not authorized to manage this candidate",
    ALREADY_SHORTLISTED: "This candidate has already been shortlisted",
    NO_PAYMENT_METHOD: "No payment method on file",
    NO_STRIPE_CUSTOMER: "Payment setup incomplete",
    SHORTLIST_PAYMENT_FAILED:
      "Payment authorization failed. Please check your payment method and try again.",
    NO_CALENDAR_CONNECTED:
      "You must connect a calendar (Google or Microsoft) before sending interview invites.",
    INVALID_STAGE_FOR_INVITE:
      "Candidate must be in shortlisted or interview invite sent stage to send an invite.",
    INTERVIEW_INVITE_FAILED: "Failed to send interview invite",
    INVALID_WORKING_HOURS: "End time must be later than start time.",
    INVALID_STAGE_FOR_HIRE:
      "Candidate must be in interview_completed stage to be hired",
    HIRE_DATE_IN_FUTURE: "Hire date cannot be in the future",
    MISSING_CONNECTOR_CLASSIFICATIONS:
      "All connectors on this candidate must be classified",
    INTERNAL_REQUIRES_ACTIVE_FLAG:
      "Active employee status is required when classification is internal",
    NO_PENDING_PAYOUTS: "No pending payouts found for this candidate",
    PROBATION_NOT_ELAPSED:
      "Probation period has not elapsed for at least one payout that requires it",
    HIRE_FAILED: "Failed to move candidate to Hired stage",
    INVALID_STAGE_FOR_RELEASE:
      "Candidate must be in hired stage to release payouts",
  },
  SUCCESS: {
    REJECTED: "Candidate has been rejected successfully",
    SHORTLISTED: "Candidate has been shortlisted successfully",
    INTERVIEW_INVITE_SENT: "Interview invite sent successfully",
    HIRED: "Candidate has been moved to Hired stage successfully",
    CLASSIFICATIONS_UPDATED: "Connector classifications updated successfully",
    PAYOUT_RELEASED: "Payouts released successfully",
  },
} as const;

export const INTERVIEW_TOKEN_EXPIRY_DAYS = 30;
export const INTERVIEW_DURATION_MINUTES = 30;
