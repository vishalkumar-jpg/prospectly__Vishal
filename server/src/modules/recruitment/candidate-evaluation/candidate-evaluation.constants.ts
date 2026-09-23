export const CANDIDATE_EVALUATION_CONFIG = {
  THRESHOLDS: {
    MINIMUM_MATCH: 50, // Configurable minimum for review
  },
  STAGES: {
    PROCESSING: "processing",
    IN_REVIEW: "in_review",
    REJECTED: "rejected",
    JD_MISMATCHED: "jd_mismatched",
    NOT_QUALIFIED: "not_qualified",
  },
  ANALYSIS_STATUS: {
    PENDING: "pending",
    COMPLETED: "completed",
    FAILED: "failed",
  },
} as const;

export const CANDIDATE_EVALUATION_QUEUE_NAME = "candidate-evaluation-queue";
export const CANDIDATE_EVALUATION_QUEUE_JOBS = {
  ANALYZE: "analyze",
} as const;

export const MAX_CANDIDATE_EVALUATION_RETRIES = 5;

export const CANDIDATE_EVALUATION_MESSAGES = {
  ERROR: {
    CANDIDATE_NOT_FOUND: "Application not found",
    EVALUATION_NOT_FAILED: "Only failed evaluations can be retried",
    EVALUATION_MAX_RETRIES: "Maximum retry attempts reached",
    EVALUATION_QUEUE_UNAVAILABLE:
      "Evaluation job is no longer available for retry",
  },
} as const;

export const CANDIDATE_EVALUATION_QUEUE_CONFIG = {
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
} as const;

export {
  candidateGapAnalysisAiSchema as CandidateEvaluationResultSchema,
  validateCandidateGapAnalysisResponse as validateCandidateEvaluationResponse,
  type CandidateGapAnalysisResult as CandidateEvaluationResult,
  type CandidateGapAnalysisAiResult as CandidateEvaluationAiResult,
} from "./candidate-evaluation-gap-analysis.schema";
