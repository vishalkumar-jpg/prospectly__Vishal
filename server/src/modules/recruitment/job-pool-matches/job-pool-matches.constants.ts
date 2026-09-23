export const JOB_POOL_MATCH_STATUS = {
  PROCESSING: "processing",
  PENDING: "pending",
  APPROVED: "approved",
  CONNECTOR_DECLINED: "connector_declined",
  CONSENT_PENDING: "consent_pending",
  CONSENT_ACCEPTED: "consent_accepted",
  CONSENT_DECLINED: "consent_declined",
  /** Another connector won consent for this job+candidate. */
  CONSENT_SUPERSEDED: "consent_superseded",
  FAILED: "failed",
} as const;

export const JOB_POOL_MATCH_SOURCE = {
  AI_MATCHED: "ai_matched",
  CONNECTOR_UPLOADED: "connector_uploaded",
} as const;

export const JOB_POOL_MATCH_QUEUE_NAME = "job-pool-match-compute";

export const JOB_POOL_MATCH_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 30000,
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

export const JOB_POOL_MATCH_MESSAGES = {
  SUCCESS: {
    MATCHES_FETCHED: "Job pool matches fetched successfully",
    MATCH_APPROVED: "Match approved successfully",
    MATCH_DECLINED: "Match declined successfully",
  },
  ERROR: {
    JOB_NOT_FOUND: "Job not found or you do not have access to view it",
    MATCH_NOT_FOUND: "Match not found or already processed",
    MATCH_NOT_PENDING: "Only pending matches can be declined",
    CONTACT_NOT_IN_NETWORK: "This contact does not belong to your network",
    COMPUTE_FAILED: "Failed to compute matches",
    CONSENT_ALREADY_SENT: "Consent has already been sent for this candidate",
    CONSENT_ALREADY_RESPONDED:
      "This consent request has already been responded to",
    CONSENT_DECLINED_PERMANENT:
      "This consent was declined and cannot be changed",
    JOB_CLOSED:
      "This job has been closed. No further actions can be taken on its candidates.",
  },
} as const;

/**
 * Job-scoped soft lock: only after the candidate accepts one connector.
 * Multiple connectors may send consent in parallel until then (Rule 1).
 */
export const CLAIMED_STATUSES = [
  JOB_POOL_MATCH_STATUS.CONSENT_ACCEPTED,
] as const;

/** Pool-match statuses that must not be reset by a resume re-upload. */
export const CONSENT_LOCKED_STATUSES = [
  JOB_POOL_MATCH_STATUS.CONSENT_PENDING,
  JOB_POOL_MATCH_STATUS.CONSENT_ACCEPTED,
  JOB_POOL_MATCH_STATUS.CONSENT_DECLINED,
  JOB_POOL_MATCH_STATUS.CONSENT_SUPERSEDED,
] as const;

/**
 * Referred `job_candidates` stages visible on the connector Refer Candidates
 * inbox/board (share-link + consent-applied). Shared by job-pool-matches and
 * connector-pipeline so both stay aligned.
 */
export const INCLUDED_CONNECTOR_REFERRED_STAGES = [
  "processing",
  "in_review",
  "shortlisted",
  "interview_invite_sent",
  "interview_scheduled",
  "interview_completed",
  "hired",
  "rejected",
  "not_qualified",
] as const;

// Embedding & LLM matching constants
export const TOP_CANDIDATES_PER_JOB = 50;
export const LLM_BATCH_SIZE = 15;
export const MIN_LLM_SCORE_THRESHOLD = 50;
export const EMBEDDING_BATCH_SIZE = 100;
export const MIN_COSINE_SIMILARITY = 0.3;

/**
 * Ceiling on a single batchEmbedContents call. Generous because a batch is up
 * to 100 documents, but bounded — without it a hung connection holds a BullMQ
 * worker slot forever and no retry policy ever gets a chance to run.
 */
export const EMBEDDING_API_TIMEOUT_MS = 60000;

// Queue job names
export const QUEUE_JOBS = {
  COMPUTE_FOR_JOB: "compute-for-job",
  COMPUTE_FOR_CONTACTS: "compute-for-contacts",
  GENERATE_CONTACT_EMBEDDINGS: "generate-contact-embeddings",
  BACKFILL_CONTACT_EMBEDDINGS: "backfill-contact-embeddings",
} as const;
