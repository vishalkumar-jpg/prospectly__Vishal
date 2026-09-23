export const REFERRAL_QUEUE_NAME = "referral-queue";

export const REFERRAL_JOB_TYPES = {
  UPDATE_REFERRAL_PROGRESS: "update-referral-progress",
  VERIFY_CONTACTS: "verify-contacts",
  CHECK_THRESHOLDS: "check-thresholds",
  SEND_INVITE_EMAIL: "send-invite-email",
} as const;

export const REFERRAL_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 2000, // 2 second initial delay
    },
    removeOnComplete: {
      age: 24 * 60 * 60, // Keep completed jobs for 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
    },
  },
};
