export const TRUST_SCORE_QUEUE_NAME = "trust-score-calculation";

export const TRUST_SCORE_MESSAGES = {
  ERROR: {
    USER_NOT_FOUND: "User profile not found",
  },
};

export const TRUST_SCORE_JOB_TYPES = {
  GOOGLE_CONTACT_IMPORT: "google_contact_import",
  MICROSOFT_CONTACT_IMPORT: "microsoft_contact_import",
  APPLE_CONTACT_IMPORT: "apple_contact_import",
  LINKEDIN_ZIP_IMPORT: "linkedin_zip_import",
  RESPONSE_WITHIN_48H: "response_within_48h",
  NO_RESPONSE_48H: "no_response_48h",
  HIGH_SUCCESS_RATE: "high_success_rate",
  CSV_MANUAL_UPLOAD: "csv_manual_upload",
  POSITIVE_PEER_REVIEWS: "positive_peer_reviews",
  FEEDBACK_TRUST_SCORE_CALCULATION: "feedback_trust_score_calculation",
  SUCCESS_RATE_CALCULATION: "success_rate_calculation",
  RESPONSE_RATE_RECOVERY: "response_rate_recovery",
} as const;

export const TRUST_SCORE_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 60000, // 1 minute
    },
    removeOnComplete: {
      age: 24 * 60 * 60, // 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60, // 7 days
    },
  },
};
