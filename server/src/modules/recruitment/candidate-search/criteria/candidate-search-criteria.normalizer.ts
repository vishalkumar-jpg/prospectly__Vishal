import {
  buildKeywordQuery,
  normalizeResumeSearchQuery,
} from "modules/recruitment/resume-search/services/resume-search-query.normalizer";
import { RESUME_SEARCH_MAX_QUERY_LENGTH } from "modules/recruitment/resume-search/resume-search.constants";
import type {
  CriteriaSummary,
  NormalisedCriteria,
  CriteriaOrigin,
} from "./candidate-search-criteria";
import {
  CANDIDATE_SEARCH_DEFAULT_PAGE_SIZE,
  CANDIDATE_SEARCH_EDUCATION_LEVELS,
  CANDIDATE_SEARCH_EMPLOYMENT_TYPES,
  CANDIDATE_SEARCH_MAX_ARRAY_SIZE,
  CANDIDATE_SEARCH_MAX_EXPERIENCE_YEARS,
  CANDIDATE_SEARCH_MAX_JOB_IDS,
  CANDIDATE_SEARCH_MAX_PAGE_SIZE,
  CANDIDATE_SEARCH_MAX_TEXT_LENGTH,
  CANDIDATE_SEARCH_SORTS,
  CANDIDATE_SEARCH_WORK_MODES,
} from "../candidate-search.constants";

/**
 * Turns anything claiming to be criteria — a validated DTO, a URL-decoded object,
 * a saved search written by an older version — into the one normalised shape every
 * layer reads (ADR-005 §11).
 *
 * Pure by design: no DB, no I/O, no clock, no randomness. It runs per request and
 * again over any stored criteria a follow-on introduces, so it has to be cheap and
 * deterministic.
 *
 * **Tolerant, never throwing.** Unknown keys are dropped by construction — nothing
 * here reads a key it does not know — and an invalid enum value is dropped rather
 * than rejected. The DTO already 400s a malformed *request*; this function's job is
 * the other caller, a stale saved search, which must degrade instead of 500ing
 * (plan §12). Rejection belongs at the wire boundary, tolerance behind it.
 *
 * **Cross-field rules live here, not in the DTO** (plan §10.3): `from > to` is
 * domain logic, and putting it in the DTO would leave stored criteria unchecked.
 */

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Deduped case-insensitively but stored in the form the caller sent: facet values
 * are the corpus's canonical spelling (plan §6.7), so lower-casing them would make
 * the chips and the Why column shout.
 */
function textArray(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const entry of value) {
    const item = text(entry, CANDIDATE_SEARCH_MAX_TEXT_LENGTH);
    if (item === null || seen.has(item.toLowerCase())) continue;

    seen.add(item.toLowerCase());
    out.push(item);
    if (out.length >= maxItems) break;
  }

  return out;
}

function intArray(value: unknown, maxItems: number): number[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<number>();
  const out: number[] = [];

  for (const entry of value) {
    const item = typeof entry === "number" ? entry : Number(entry);
    if (!Number.isInteger(item) || seen.has(item)) continue;

    seen.add(item);
    out.push(item);
    if (out.length >= maxItems) break;
  }

  return out;
}

function enumArray<T extends string>(
  value: unknown,
  allowed: readonly T[],
  maxItems: number
): T[] {
  const out: T[] = [];

  for (const item of textArray(value, maxItems)) {
    const match = allowed.find((option) => option === item.toLowerCase());
    if (match !== undefined && !out.includes(match)) out.push(match);
  }

  return out;
}

function pickEnum<T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | null {
  const item = text(value, CANDIDATE_SEARCH_MAX_TEXT_LENGTH);
  if (item === null) return null;

  return allowed.find((option) => option === item.toLowerCase()) ?? null;
}

/** Numeric strings are accepted: URL-encoded criteria arrive as strings. */
function int(value: unknown, min: number, max: number): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (!Number.isFinite(parsed)) return null;

  return Math.min(Math.max(Math.round(parsed), min), max);
}

/**
 * Keeps the date part of any ISO string, and rejects a well-formed-but-impossible
 * day such as `2026-02-31` — Postgres would raise on the cast, i.e. a 500 raised by
 * a stale saved search. `Date.parse` is no use here: it silently rolls that day over
 * to 3 March. Constructing the UTC date and reading the day back is the check that
 * actually catches it, and it reads no clock.
 */
function isoDay(value: unknown): string | null {
  const raw = text(value, 40);
  if (raw === null) return null;

  const day = raw.slice(0, 10);
  if (!ISO_DAY.test(day)) return null;

  const [year, month, date] = day.split("-").map(Number);
  const asUtc = new Date(Date.UTC(year, month - 1, date));

  return asUtc.getUTCMonth() === month - 1 && asUtc.getUTCDate() === date
    ? day
    : null;
}

/** Inclusive bounds only make sense in order; a reversed pair is a typo, not empty. */
function ordered<T extends number | string>(
  from: T | null,
  to: T | null
): [T | null, T | null] {
  return from !== null && to !== null && from > to ? [to, from] : [from, to];
}

/**
 * Tolerant, like every other reader here: an origin that arrives malformed —
 * from a hand-edited URL, or a saved search written by an older build — is
 * dropped rather than thrown on. The criteria it described are still present as
 * ordinary fields, so the search degrades to "the same filters, unexplained"
 * instead of failing.
 */
function origin(value: unknown): CriteriaOrigin | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const src = value as Record<string, unknown>;
  if (src.kind !== "jd") return null;

  const title = typeof src.title === "string" ? src.title.trim() : "";
  if (!title) return null;

  return {
    kind: "jd",
    title: title.slice(0, CANDIDATE_SEARCH_MAX_TEXT_LENGTH),
    derivedSkills: textArray(
      src.derivedSkills,
      CANDIDATE_SEARCH_MAX_ARRAY_SIZE
    ),
    derivedBonus: textArray(src.derivedBonus, CANDIDATE_SEARCH_MAX_ARRAY_SIZE),
  };
}

export function blankCriteria(): NormalisedCriteria {
  return {
    query: null,
    origin: null,
    jobIds: [],
    titles: [],
    skills: [],
    bonus: [],
    companies: [],
    industryIds: [],
    countries: [],
    location: null,
    experienceMin: null,
    experienceMax: null,
    scoreMin: null,
    scoreMax: null,
    employmentTypes: [],
    workModes: [],
    stageIds: [],
    educationLevels: [],
    sources: [],
    appliedFrom: null,
    appliedTo: null,
    sort: "applied",
    sortDir: "desc",
    page: 1,
    pageSize: CANDIDATE_SEARCH_DEFAULT_PAGE_SIZE,
  };
}

/**
 * The meaningful words a free-text query contributes, reusing the resume-search
 * tokeniser rather than growing a second stopword list to drift against it.
 * Phrases first — a quoted phrase is the more specific signal.
 */
/**
 * Fallback only, for when the planner could not read the query.
 *
 * Splitting a sentence into words and scoring each one is wrong for anything
 * conversational: "we are looking for someone who can build APIs" becomes
 * criteria `we`, `are`, `for`, `can`, and a candidate who obviously fits scores
 * a fraction because most of those words are filler. The planner's
 * `requiredSkills` are the honest answer — see `plannedQueryTerms` in the
 * ranking service — and this runs only when planning failed.
 *
 * Punctuation variants are excluded: they widen retrieval, but `we/are` is not
 * a requirement and must never reach a score or the Why column.
 */
export function extractQueryTerms(query: string | null): string[] {
  if (query === null) return [];

  const { tokens, phrases } = buildKeywordQuery(
    normalizeResumeSearchQuery(query),
    { expandPunctuation: false }
  );
  return [...phrases, ...tokens];
}

/**
 * `total` counts every applied criterion *value* — it answers "is any criterion
 * applied?" (which is what makes the Match % column exist) and feeds the drawer
 * badge. Sort and pagination are not criteria and never count.
 *
 * It is deliberately not the same number as `FitResult.criteriaCount`: fit groups a
 * multi-value facet into one OR-ed criterion and a two-bound range into one range
 * criterion, because that is how they are satisfied (plan §7.1).
 */
export function summarizeCriteria(
  criteria: NormalisedCriteria,
  /**
   * What the free text actually asked for, as understood by the planner.
   *
   * `[]` is meaningful and different from `undefined`: it says the planner read
   * the query and found no checkable requirement — "someone who can build APIs"
   * describes a kind of person, not a box to tick. Then the text contributes
   * nothing scoreable and relevance alone orders the results, which is honest.
   * `undefined` means nobody planned it, so the word-splitting fallback stands.
   */
  queryTerms?: readonly string[]
): CriteriaSummary {
  const arrays: readonly (readonly unknown[])[] = [
    criteria.jobIds,
    criteria.titles,
    criteria.skills,
    // Counted even though it never filters: it contributes to the fit
    // denominator, so a search carrying only nice-to-haves must still score.
    // Leaving it out let the caller skip scoring entirely and render no
    // percentage for criteria that were demonstrably applied.
    criteria.bonus,
    criteria.companies,
    criteria.industryIds,
    criteria.countries,
    criteria.employmentTypes,
    criteria.workModes,
    criteria.stageIds,
    criteria.educationLevels,
    criteria.sources,
  ];
  const scalars: readonly (string | number | null)[] = [
    criteria.query,
    criteria.location,
    criteria.experienceMin,
    criteria.experienceMax,
    criteria.scoreMin,
    criteria.scoreMax,
    criteria.appliedFrom,
    criteria.appliedTo,
  ];

  return {
    total:
      arrays.reduce((sum, values) => sum + values.length, 0) +
      scalars.filter((value) => value !== null).length,
    scoreable:
      criteria.skills.length +
      criteria.bonus.length +
      (queryTerms ?? extractQueryTerms(criteria.query)).length,
  };
}

export function normalizeCriteria(input: unknown): NormalisedCriteria {
  const src: Record<string, unknown> = isRecord(input) ? input : {};

  const [experienceMin, experienceMax] = ordered(
    int(src.experienceMin, 0, CANDIDATE_SEARCH_MAX_EXPERIENCE_YEARS),
    int(src.experienceMax, 0, CANDIDATE_SEARCH_MAX_EXPERIENCE_YEARS)
  );
  const [scoreMin, scoreMax] = ordered(
    int(src.scoreMin, 0, 100),
    int(src.scoreMax, 0, 100)
  );
  const [appliedFrom, appliedTo] = ordered(
    isoDay(src.appliedFrom),
    isoDay(src.appliedTo)
  );

  const criteria: NormalisedCriteria = {
    ...blankCriteria(),
    query: text(src.query, RESUME_SEARCH_MAX_QUERY_LENGTH),
    jobIds: textArray(src.jobIds, CANDIDATE_SEARCH_MAX_JOB_IDS),
    titles: textArray(src.titles, CANDIDATE_SEARCH_MAX_ARRAY_SIZE),
    skills: textArray(src.skills, CANDIDATE_SEARCH_MAX_ARRAY_SIZE),
    bonus: textArray(src.bonus, CANDIDATE_SEARCH_MAX_ARRAY_SIZE),
    origin: origin(src.origin),
    companies: textArray(src.companies, CANDIDATE_SEARCH_MAX_ARRAY_SIZE),
    industryIds: intArray(src.industryIds, CANDIDATE_SEARCH_MAX_ARRAY_SIZE),
    countries: textArray(src.countries, CANDIDATE_SEARCH_MAX_ARRAY_SIZE),
    location: text(src.location, CANDIDATE_SEARCH_MAX_TEXT_LENGTH),
    experienceMin,
    experienceMax,
    scoreMin,
    scoreMax,
    employmentTypes: enumArray(
      src.employmentTypes,
      CANDIDATE_SEARCH_EMPLOYMENT_TYPES,
      CANDIDATE_SEARCH_MAX_ARRAY_SIZE
    ),
    workModes: enumArray(
      src.workModes,
      CANDIDATE_SEARCH_WORK_MODES,
      CANDIDATE_SEARCH_MAX_ARRAY_SIZE
    ),
    stageIds: intArray(src.stageIds, CANDIDATE_SEARCH_MAX_ARRAY_SIZE),
    educationLevels: enumArray(
      src.educationLevels,
      CANDIDATE_SEARCH_EDUCATION_LEVELS,
      CANDIDATE_SEARCH_MAX_ARRAY_SIZE
    ),
    sources: textArray(src.sources, CANDIDATE_SEARCH_MAX_ARRAY_SIZE),
    appliedFrom,
    appliedTo,
    sortDir: pickEnum(src.sortDir, ["asc", "desc"] as const) ?? "desc",
    page: int(src.page, 1, Number.MAX_SAFE_INTEGER) ?? 1,
    pageSize:
      int(src.pageSize, 1, CANDIDATE_SEARCH_MAX_PAGE_SIZE) ??
      CANDIDATE_SEARCH_DEFAULT_PAGE_SIZE,
  };

  /**
   * Default sort is criteria-dependent (plan §6.2): with nothing applied there is
   * no fit to sort by, so the unfiltered browse falls back to Applied desc. Decided
   * here so the repository and the client cannot disagree about it.
   */
  criteria.sort =
    pickEnum(src.sort, CANDIDATE_SEARCH_SORTS) ??
    (summarizeCriteria(criteria).total > 0 ? "fit" : "applied");

  return criteria;
}
