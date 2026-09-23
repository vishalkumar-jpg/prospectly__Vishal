import {
  RECRUITMENT_EMPLOYMENT_TYPES,
  RECRUITMENT_EMPLOYMENT_TYPE_LABELS,
} from "database/schema/recruitment-jobs";
import { EDUCATION_LEVELS } from "modules/recruitment/resume-extraction/resume-education-level.normalizer";

/** Route prefix. Deliberately not `recruitment/candidates` — that path is taken. */
export const CANDIDATE_SEARCH_ROUTE = "recruitment/candidate-search";

/* ------------------------------------------------------------------ vocabularies */

/**
 * Re-exported rather than redefined: the wizard writes these values and the
 * search filters on them, so a second copy would drift (ADR-005 §8).
 */
export const CANDIDATE_SEARCH_EMPLOYMENT_TYPES = RECRUITMENT_EMPLOYMENT_TYPES;
export const CANDIDATE_SEARCH_EMPLOYMENT_TYPE_LABELS =
  RECRUITMENT_EMPLOYMENT_TYPE_LABELS;
export const CANDIDATE_SEARCH_EDUCATION_LEVELS = EDUCATION_LEVELS;

/** Mirrors `normalizeWorkType` in job-extraction — the only producer of the column. */
export const CANDIDATE_SEARCH_WORK_MODES = [
  "remote",
  "hybrid",
  "onsite",
] as const;

export const CANDIDATE_SEARCH_SORTS = ["fit", "experience", "applied"] as const;
export type CandidateSearchSort = (typeof CANDIDATE_SEARCH_SORTS)[number];

/* ----------------------------------------------------------------------- limits */

/** Client control and DTO ceiling must be the same number, or the last option 400s. */
export const CANDIDATE_SEARCH_PAGE_SIZES = [10, 25, 50, 100] as const;
export const CANDIDATE_SEARCH_DEFAULT_PAGE_SIZE = 25;
export const CANDIDATE_SEARCH_MAX_PAGE_SIZE = 100;

/**
 * Rank and score within this cap, then page inside it. Deep OFFSET becomes
 * impossible by construction, which is why keyset pagination is unnecessary
 * (ADR-005 §9). When the cap bites the response says `truncated: true`.
 */
export const CANDIDATE_SEARCH_MAX_SCORED_ROWS = 2000;

/** An unbounded array is a trivial DoS against a tsquery or a GIN scan. */
export const CANDIDATE_SEARCH_MAX_ARRAY_SIZE = 25;
export const CANDIDATE_SEARCH_MAX_JOB_IDS = 200;
export const CANDIDATE_SEARCH_MAX_TEXT_LENGTH = 120;

export const CANDIDATE_SEARCH_MAX_EXPERIENCE_YEARS = 60;

/* ---------------------------------------------------------------- fit weighting */

/**
 * Every applied criterion contributes (ADR-005 §4). Partially-satisfiable
 * criteria weigh most because they are what actually separates candidates;
 * hard-filtered facets are always met by survivors and act as confirmation.
 *
 * Consequence, and it is intended: facets add the same amount to both sides of
 * the fraction, so the middle of the range compresses. Two facets plus three
 * skills puts a one-skill match at 60%, not 33% — they do satisfy more of what
 * was asked. A full match is still exactly 100%.
 */
export const FIT_WEIGHT_SKILL = 10;
export const FIT_WEIGHT_QUERY_TERM = 8;
/**
 * Nice-to-haves from a job description. Deliberately below a required skill:
 * a preferred skill that counted the same would let a candidate matching three
 * optional extras outrank one matching the actual requirements.
 */
export const FIT_WEIGHT_BONUS = 4;

export const FIT_WEIGHT_FACET = 3;
export const FIT_WEIGHT_RANGE = 3;

/* --------------------------------------------------------------------- caching */

/** Bump the version segment when the cached shape changes. */
export const CANDIDATE_SEARCH_DEFAULT_VIEW_CACHE_PREFIX =
  "candidate-search:default:v1:";
export const CANDIDATE_SEARCH_DEFAULT_VIEW_CACHE_TTL_SECONDS = 60;
export const CANDIDATE_SEARCH_FACETS_CACHE_PREFIX =
  "candidate-search:facets:v1:";
export const CANDIDATE_SEARCH_FACETS_CACHE_TTL_SECONDS = 300;

/**
 * JD extractions are cached on a hash of the document, because pasting the same
 * description twice is the normal way to use the sheet — tweak a filter, come
 * back, paste again — and it must not bill twice. Bump the version segment when
 * `ParsedJobDescription` changes shape.
 */
export const CANDIDATE_SEARCH_JD_CACHE_PREFIX = "candidate-search:jd:v1:";
export const CANDIDATE_SEARCH_JD_CACHE_TTL_SECONDS = 60 * 60 * 24;

/** Bump when the intent schema or prompt changes. */
export const CANDIDATE_SEARCH_INTENT_CACHE_PREFIX =
  "candidate-search:intent:v1:";
export const CANDIDATE_SEARCH_INTENT_CACHE_TTL_SECONDS = 60 * 60 * 24;

/** Capped in both the DTO and the column, or one of them silently truncates. */
export const SAVED_SEARCH_TITLE_MAX_LENGTH = 60;

/** A description shorter than this is a paste accident, not a job spec. */
export const CANDIDATE_SEARCH_JD_MIN_LENGTH = 120;
export const CANDIDATE_SEARCH_JD_MAX_LENGTH = 20000;

/* --------------------------------------------------------------- accuracy §6.6 */

/** Below this, résumé indexing is a backlog to clear, not a query to tune. */
export const CANDIDATE_SEARCH_MIN_HEALTHY_COVERAGE_PCT = 90;
