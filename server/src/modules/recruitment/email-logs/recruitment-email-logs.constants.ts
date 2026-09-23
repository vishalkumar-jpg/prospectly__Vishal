export const RECRUITMENT_EMAIL_LOG_TYPE = {
  NEW_JOB_OPPORTUNITIES: "new_job_opportunities",
  INTERVIEW_BOOKING_ERROR: "interview_booking_error",
  CANDIDATE_CONSENT: "candidate_consent",
  INTERVIEW_INVITE: "interview_invite",
  RECRUITER_NEW_CANDIDATE: "recruiter_new_candidate",
  CANDIDATE_SHORTLISTED: "candidate_shortlisted",
  CONNECTOR_SHORTLISTED: "connector_shortlisted",
  CONNECTOR_INTERVIEW_INVITE: "connector_interview_invite",
  CONNECTOR_INTERVIEW_SCHEDULED: "connector_interview_scheduled",
  CONNECTOR_INTERVIEW_COMPLETED: "connector_interview_completed",
  CANDIDATE_HIRED: "candidate_hired",
  CONNECTOR_HIRED: "connector_hired",
  CANDIDATE_REJECTED: "candidate_rejected",
  CONNECTOR_REJECTED: "connector_rejected",
  CANDIDATE_PAYOUT_SETUP: "candidate_payout_setup",
  CONNECTOR_PAYOUT_SETUP: "connector_payout_setup",
  CANDIDATE_PAYOUT_RELEASED: "candidate_payout_released",
  CONNECTOR_PAYOUT_RELEASED: "connector_payout_released",
  COLLABORATOR_ADDED: "collaborator_added",
  CANDIDATE_IN_REVIEW_STATUS: "candidate_in_review_status",
  CONNECTOR_IN_REVIEW_STATUS: "connector_in_review_status",
  JOB_CLOSED_CONNECTOR: "job_closed_connector",
  JOB_CLOSED_CANDIDATE: "job_closed_candidate",
  JOB_REOPENED_CONNECTOR: "job_reopened_connector",
  JOB_REOPENED_CANDIDATE: "job_reopened_candidate",
} as const;

export type RecruitmentEmailLogType =
  (typeof RECRUITMENT_EMAIL_LOG_TYPE)[keyof typeof RECRUITMENT_EMAIL_LOG_TYPE];

export const RECRUITMENT_EMAIL_RECIPIENT_TYPE = {
  CANDIDATE: "candidate",
  CONNECTOR: "connector",
  RECRUITER: "recruiter",
  /** Org members notified about a new job post (bulk notify). */
  ORG_MEMBER: "org_member",
} as const;

export type RecruitmentEmailRecipientType =
  (typeof RECRUITMENT_EMAIL_RECIPIENT_TYPE)[keyof typeof RECRUITMENT_EMAIL_RECIPIENT_TYPE];

export const RECRUITMENT_EMAIL_LOG_STATUS = {
  SENT: "sent",
  DELIVERED: "delivered",
  BOUNCED: "bounced",
  FAILED: "failed",
  COMPLAINED: "complained",
} as const;

export type RecruitmentEmailLogStatus =
  (typeof RECRUITMENT_EMAIL_LOG_STATUS)[keyof typeof RECRUITMENT_EMAIL_LOG_STATUS];

export const RECRUITMENT_EMAIL_LOG_STATUS_PRIORITY: Record<string, number> = {
  sent: 2,
  delivered: 4,
  failed: 100,
  bounced: 100,
  complained: 100,
};

/** Connector may resend only consent emails to candidates. */
export const CONNECTOR_RESENDABLE_EMAIL_TYPES: RecruitmentEmailLogType[] = [
  RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_CONSENT,
];

/** Recruiter may resend pipeline emails they trigger (candidate + connector). */
export const RECRUITER_RESENDABLE_EMAIL_TYPES: RecruitmentEmailLogType[] = [
  RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_CONSENT,
  RECRUITMENT_EMAIL_LOG_TYPE.INTERVIEW_INVITE,
  RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_SHORTLISTED,
  RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_SHORTLISTED,
  RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_INTERVIEW_INVITE,
  RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_INTERVIEW_SCHEDULED,
  RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_INTERVIEW_COMPLETED,
  RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_HIRED,
  RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_HIRED,
  RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_REJECTED,
  RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_REJECTED,
  RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_PAYOUT_SETUP,
  RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_PAYOUT_SETUP,
  RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_PAYOUT_RELEASED,
  RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_PAYOUT_RELEASED,
  RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_IN_REVIEW_STATUS,
  RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_IN_REVIEW_STATUS,
];

export const MAX_RECRUITMENT_EMAIL_RAW_EVENTS = 50;

export function isResendableEmailType(
  emailType: string,
  audience: "connector" | "recruiter"
): boolean {
  if (audience === "connector") {
    return CONNECTOR_RESENDABLE_EMAIL_TYPES.includes(
      emailType as (typeof CONNECTOR_RESENDABLE_EMAIL_TYPES)[number]
    );
  }
  return RECRUITER_RESENDABLE_EMAIL_TYPES.includes(
    emailType as (typeof RECRUITER_RESENDABLE_EMAIL_TYPES)[number]
  );
}

export const RECRUITMENT_EMAIL_LOGS_MESSAGES = {
  ERROR: {
    NOT_FOUND: "Email log not found",
    FORBIDDEN: "You do not have access to these email logs",
    RESEND_NOT_ALLOWED: "This email cannot be resent",
    RESEND_FAILED: "Failed to resend email",
    RESEND_MISSING_CONTENT:
      "This email was sent before delivery tracking was enabled and cannot be resent automatically.",
    CANDIDATE_NOT_FOUND: "Candidate not found",
    MATCH_NOT_FOUND: "Pool match not found",
  },
  SUCCESS: {
    RESENT: "Email resent successfully",
  },
} as const;

export const RECRUITMENT_EMAIL_LOG_PERSIST_QUEUE_NAME =
  "recruitment-email-log-persist";

export const RECRUITMENT_EMAIL_LOG_PERSIST_JOB = "persist-email-log";

export const RECRUITMENT_EMAIL_LOG_PERSIST_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential" as const, delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
};

export const RECRUITMENT_EMAIL_LOG_PERSIST_INLINE_RETRIES = 3;
export const RECRUITMENT_EMAIL_LOG_PERSIST_INLINE_RETRY_DELAY_MS = 250;
