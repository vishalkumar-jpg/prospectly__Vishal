import { createHash } from "node:crypto";

export const RECRUITMENT_NOTIFICATION_QUEUE_NAME = "recruitment-notification";

export const RECRUITMENT_NOTIFICATION_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 60000,
    },
    removeOnComplete: {
      age: 7 * 24 * 60 * 60,
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60,
    },
  },
};

export const RECRUITMENT_NOTIFICATION_QUEUE_JOBS = {
  SEND_NEW_JOB_POST: "send-new-job-post",
  SEND_INTERVIEW_BOOKING_ERROR: "send-interview-booking-error",
  SEND_LIFECYCLE: "send-lifecycle",
  SEND_COLLABORATOR_ADDED: "send-collaborator-added",
  SEND_JOB_CLOSED: "send-job-closed",
  SEND_JOB_REOPENED: "send-job-reopened",
} as const;

/** Payload for the single-recipient "you've been added as a collaborator" email. */
export interface CollaboratorAddedEmailJobData {
  collaboratorUserId: string;
  /** The user who performed the add (rendered as the email's sender name). */
  ownerId: string;
  jobId: string;
}

/** Notification types stored on recruitment_notifications.type. */
export const RECRUITMENT_NOTIFICATION_TYPE = {
  NEW_JOB_POST: "new_job_post",
  INTERVIEW_BOOKING_ERROR: "interview_booking_error",
} as const;

export type InterviewBookingErrorStage = "availability" | "confirmation";

export const buildInterviewBookingErrorJobId = (
  candidateId: string,
  stage: InterviewBookingErrorStage,
  errorMessage: string
): string => {
  const hash = createHash("sha256")
    .update(errorMessage)
    .digest("hex")
    .slice(0, 12);
  return `recruitment-booking-error-${candidateId}-${stage}-${hash}`;
};

/** Lifecycle states for recruitment_notifications.status. */
export const RECRUITMENT_NOTIFICATION_STATUS = {
  PENDING: "pending",
  SENDING: "sending",
  SENT: "sent",
  PARTIALLY_FAILED: "partially_failed",
  FAILED: "failed",
} as const;

/** Platform value used for the system-generated share row backing the email CTA link. */
export const NOTIFICATION_SHARE_PLATFORM = "recruiter_new_job_alert";

/** Max organisations a recruiter can target in a single notification. */
export const MAX_NOTIFY_ORGANISATIONS = 50;

/**
 * Memory & rate-safety knobs for the bulk send.
 * Recipients are read from the DB in pages of this size (never all at once).
 */
export const RECRUITMENT_NOTIFICATION_DB_PAGE_SIZE = 1000;
/** Resend Batch API accepts up to 100 emails per call. */
export const RECRUITMENT_NOTIFICATION_EMAIL_BATCH_SIZE = 100;
/**
 * Delay (ms) the worker waits after each Resend batch call before sending the
 * next one. This is the single knob for how fast the bulk send runs — raise it
 * to send more slowly / gentler on rate limits, lower it to send faster.
 * At 3000ms the worker sends ~100 emails every 3s (≈ 5 min for 10k recipients).
 */
export const RECRUITMENT_NOTIFICATION_BATCH_DELAY_MS = 3000;

export const RECRUITMENT_NOTIFICATION_MESSAGES = {
  SUCCESS: {
    QUEUED: "Job notification has been queued and will be sent shortly",
  },
  ERROR: {
    JOB_NOT_FOUND: "Recruitment job not found",
    NOT_JOB_OWNER:
      "You are not authorized to send notifications for this job post",
    JOB_NOT_ACTIVE: "Notifications can only be sent for active job posts",
    NOTIFICATION_IN_PROGRESS:
      "A notification for this job post is still sending. Please wait until it completes before sending again.",
    NO_ORGANISATIONS: "Select at least one organization to notify",
    QUEUE_FAILED: "Failed to queue the job notification",
  },
} as const;
