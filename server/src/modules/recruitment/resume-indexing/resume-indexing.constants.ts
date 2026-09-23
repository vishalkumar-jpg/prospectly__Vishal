export const RESUME_INDEXING_QUEUE_NAME = "resume-indexing";

export const RESUME_INDEXING_QUEUE_JOBS = {
  INDEX: "index-resume",
  BACKFILL_SCAN: "backfill-scan-resumes",
} as const;

/**
 * Backoff is longer than the sibling resume-extraction queue because the
 * dominant failure here is a Gemini 429, which needs real spacing to clear.
 */
export const RESUME_INDEXING_QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 4,
    backoff: {
      type: "exponential" as const,
      delay: 30000,
    },
    removeOnComplete: {
      age: 3 * 24 * 60 * 60,
      count: 500,
    },
    removeOnFail: {
      age: 14 * 24 * 60 * 60,
    },
  },
};

/** Stored FTS column budget. Well under the 1 MB `to_tsvector` value limit. */
export const RESUME_TEXT_MAX_CHARS = 60000;

/** Below this, the PDF is treated as scanned and the structured fallback wins. */
export const RESUME_TEXT_MIN_CHARS = 200;

/** Catches PDFs that emit whitespace and CID garbage rather than words. */
export const RESUME_TEXT_MIN_ALPHA_RATIO = 0.5;

/** Embedding input budget — see buildEmbeddingDocument for why. */
export const EMBED_DOC_MAX_CHARS = 6000;

export const RESUME_INDEXING_MAX_PDF_BYTES = 10 * 1024 * 1024;

export const RESUME_PDF_EXTRACT_TIMEOUT_MS = 30000;

export const RESUME_EMBEDDING_MODEL = "gemini-embedding-001";

export const RESUME_INDEXING_BACKFILL_PAGE_SIZE = 200;

export const RESUME_INDEXING_BACKFILL_MAX_PAGE_SIZE = 500;

/** Spreads a backfill page's Gemini calls instead of firing them at once. */
export const RESUME_INDEXING_BACKFILL_STAGGER_MS = 250;
