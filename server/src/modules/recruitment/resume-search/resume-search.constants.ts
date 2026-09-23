export const RESUME_SEARCH_MIN_QUERY_LENGTH = 3;
export const RESUME_SEARCH_MAX_QUERY_LENGTH = 200;
export const RESUME_SEARCH_MAX_TOKENS = 12;
export const RESUME_SEARCH_MAX_TOKEN_LENGTH = 40;
export const RESUME_SEARCH_MAX_PHRASES = 2;

/** Standard Reciprocal Rank Fusion constant (Cormack et al.). */
export const RESUME_SEARCH_RRF_K = 60;

/** Per-branch cap before fusion. */
export const RESUME_SEARCH_BRANCH_LIMIT = 100;

export const RESUME_SEARCH_MAX_RESULTS = 50;

/**
 * Candidates that met some but not all hard requirements. Shown separately so
 * a recruiter can see who was close and exactly which condition they failed,
 * rather than facing an empty board.
 */
export const RESUME_SEARCH_MAX_NEAR_MISSES = 20;

/** Caps on the query planner's output — it is LLM-generated, so bound it. */
export const RESUME_SEARCH_PLAN_MAX_SKILLS = 8;
export const RESUME_SEARCH_PLAN_MAX_VARIANTS = 8;
export const RESUME_SEARCH_PLAN_MAX_TERM_LENGTH = 40;
export const RESUME_SEARCH_PLAN_MAX_YEARS = 60;

export const RESUME_SEARCH_PLAN_TIMEOUT_MS = 6000;
export const RESUME_SEARCH_PLAN_MAX_ATTEMPTS = 2;

/** Bump the version segment whenever the prompt or plan shape changes. */
export const RESUME_SEARCH_PLAN_CACHE_PREFIX = "resume-search:qplan:v1:";
export const RESUME_SEARCH_PLAN_CACHE_TTL_SECONDS = 24 * 60 * 60;

/**
 * Trims the long tail only — it is NOT the quality gate, and cannot be made
 * into one. RRF is ordinal: rank 1 scores 1/61 against rank 2's 1/62, a ratio
 * of 0.984, so a document has to fall past rank 91 before this touches it.
 * Precision comes from the per-branch gates instead — the two-part vector gate
 * below, and the document-frequency filter on the keyword side.
 */
export const RESUME_SEARCH_CUTOFF_FRACTION = 0.4;

/**
 * Query→document cosine with gemini-embedding-001 spans a narrow, uncalibrated
 * band: measured off-domain noise tops out around 0.535 and the weakest true
 * positive around 0.64, so this floor sits in the empty gap between them.
 *
 * Deliberately NOT the same value as job-pool-matches' floor, which gates
 * symmetric contact↔job vectors carrying no task type — that comparison has a
 * different scale and its threshold does not transfer here.
 */
export const RESUME_SEARCH_MIN_COSINE_SIMILARITY = 0.58;

/**
 * The absolute floor only rejects off-domain noise; it cannot tell the best
 * match from a mediocre one, because cosine is not calibrated across queries.
 * That gate is relative — keep only candidates within this much of the best hit
 * for *this* query, which self-calibrates: a narrow query keeps one candidate,
 * a broad one keeps everybody who genuinely qualifies.
 */
export const RESUME_SEARCH_VECTOR_DROPOFF = 0.05;

/**
 * Postgres FTS has no corpus statistics, so `ts_rank_cd` scores a term every
 * candidate shares almost as highly as a rare one — and the OR-fold means one
 * generic token pulls in the whole pipeline. A token matching more than this
 * fraction of the job's indexed candidates carries no discriminating power and
 * is dropped from the tsquery.
 */
export const RESUME_SEARCH_MAX_TOKEN_DOC_FREQUENCY = 0.6;

export const RESUME_SEARCH_MAX_MATCHED_ON = 5;
export const RESUME_SEARCH_MAX_VOCABULARY_TERMS = 40;
export const RESUME_SEARCH_MAX_VOCABULARY_TERM_LENGTH = 40;

/** Dice bigram threshold — catches postgres/postgresql, react/reactjs. */
export const RESUME_SEARCH_RELATED_MIN_SIMILARITY = 0.55;

export const RESUME_SEARCH_EMBEDDING_DIMENSIONS = 768;
export const RESUME_SEARCH_EMBEDDING_TIMEOUT_MS = 4000;
export const RESUME_SEARCH_EMBEDDING_MAX_ATTEMPTS = 2;

/**
 * Bump the version segment whenever the model, dimensionality or task type
 * changes, so vectors from a different embedding space can never be served.
 */
export const RESUME_SEARCH_EMBEDDING_CACHE_PREFIX = "resume-search:qemb:v1:";
export const RESUME_SEARCH_EMBEDDING_CACHE_TTL_SECONDS = 24 * 60 * 60;

/**
 * Domain filler only. Postgres' `english` config already strips grammatical
 * stopwords, and seniority words like senior/junior/lead are real signal.
 */
export const RESUME_SEARCH_STOPWORDS = new Set([
  "candidate",
  "candidates",
  "resume",
  "resumes",
  "cv",
  "cvs",
  "profile",
  "profiles",
  "looking",
  "need",
  "needs",
  "want",
  "wants",
  "someone",
  "anyone",
  "find",
  "show",
  "please",
  "experience",
  "experienced",
  "background",
  "years",
  "year",
]);

export const RESUME_SEARCH_MESSAGES = {
  ERROR: {
    SEARCH_FAILED: "Failed to search candidate resumes",
  },
} as const;
