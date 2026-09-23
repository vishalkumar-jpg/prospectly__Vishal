export const CONSENT_TOKEN_EXPIRY = "7d";

export const CONSENT_MESSAGES = {
  SUCCESS: {
    CONSENT_SENT: "Consent email sent successfully",
    CONSENT_RESENT: "Consent email resent successfully",
    CONSENT_EMAIL_UPDATED:
      "Consent email updated. The new consent email is being sent.",
    CONSENT_EMAIL_LINKED:
      "Referral linked to the existing candidate profile. Consent email is being sent.",
    CONSENT_DECLINED: "Consent declined successfully",
    CONSENT_APPLIED: "Application submitted successfully",
    CONSENT_VERIFIED: "Consent token verified successfully",
  },
  ERROR: {
    MATCH_NOT_FOUND: "Match not found",
    NOT_AUTHORIZED: "You are not authorized to perform this action",
    CONSENT_ALREADY_SENT: "Consent has already been sent for this candidate",
    CONSENT_ALREADY_RESPONDED:
      "This consent request has already been responded to",
    CONSENT_DECLINED_PERMANENT:
      "This consent was declined and cannot be changed",
    TOKEN_EXPIRED: "This consent link has expired",
    TOKEN_SUPERSEDED:
      "This consent link is no longer valid. Please use the link from the most recent email.",
    TOKEN_INVALID: "This consent link is invalid",
    JOB_NOT_ACTIVE: "This job is no longer accepting candidates",
    SELF_APPLICATION: "Cannot apply to your own job",
    ALREADY_APPLIED: "You have already applied to this job",
    CANDIDATE_ALREADY_APPLIED: "This candidate has already applied to this job",
    EMAIL_MISMATCH:
      "This consent was sent to a different email. Please log in with the correct account.",
    APPLY_FAILED: "Failed to submit application",
    EMAIL_NOT_FOUND: "Could not retrieve candidate email",
    INVALID_EMAIL: "Invalid email address",
    EMAIL_UNCHANGED:
      "This is already the saved consent email. Enter a new address to send consent.",
    EMAIL_ALREADY_IN_USE: "This email is already used by another contact",
    DUPLICATE_UPLOAD_EMAIL:
      "You have already uploaded a resume for this email on this job",
    CONSENT_EMAIL_EDIT_NOT_ALLOWED:
      "Email can only be changed for resume uploads awaiting consent",
    JOB_CLOSED: "This job has been closed. Consent cannot be sent.",
    CONSENT_RESEND_NOT_PENDING:
      "Consent can only be resent while waiting for the candidate to respond",
    CLAIMED_BY_OTHER_CONNECTOR:
      "This candidate has already accepted another connector's request for this job",
    CONNECTOR_BLOCKED_BY_CANDIDATE:
      "This candidate indicated they do not know you. You cannot refer them to any job.",
    CONSENT_SUPERSEDED:
      "This candidate already accepted another connector for this job",
    RESUME_REQUIRED:
      "Resume is required to apply. Please upload your resume and try again.",
  },
} as const;

/** Candidate decline reasons accepted by the public consent decline API. */
export const CONSENT_DECLINE_REASONS = [
  "not_interested",
  "bad_timing",
  "salary",
  "location",
  "company",
  "dont_know_connector",
  "other",
] as const;

export const CONSENT_DECLINE_DONT_KNOW_CONNECTOR = "dont_know_connector";

/** Default text stored in recruitment_connector_blocks.reason when notes are empty. */
export const CONSENT_DECLINE_DONT_KNOW_CONNECTOR_LABEL =
  "I don't know this connector";
