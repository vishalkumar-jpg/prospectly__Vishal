/**
 * The one place criteria are shaped, encoded and decoded on the client.
 *
 * Applied criteria live in the URL (ADR-005 §10) so a search is shareable,
 * survives refresh and works with Back. The earlier prototype used
 * `sessionStorage`; that loses state across tabs and cannot be shared, so it is
 * deliberately not ported.
 *
 * Draft criteria are the same shape, held in drawer-local state and seeded from
 * applied on every open — which is precisely why the drawer and the quick
 * filters can never disagree.
 */

import type { ParsedJobDescription } from "@/lib/api/recruitment-candidate-search";

export type CandidateSearchSort = "fit" | "experience" | "applied";

export interface CandidateSearchCriteria {
  query: string | null;
  jobIds: string[];
  titles: string[];
  skills: string[];
  /** Nice-to-haves from a job description: they score, they never filter. */
  bonus: string[];
  companies: string[];
  industryIds: number[];
  countries: string[];
  location: string | null;
  experienceMin: number | null;
  experienceMax: number | null;
  scoreMin: number | null;
  scoreMax: number | null;
  employmentTypes: string[];
  workModes: string[];
  stageIds: number[];
  educationLevels: string[];
  sources: string[];
  appliedFrom: string | null;
  appliedTo: string | null;
  sort: CandidateSearchSort;
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
  /** Set when the criteria came from a job description. */
  origin: CriteriaOrigin | null;
}

export interface CriteriaOrigin {
  kind: "jd";
  title: string;
  derivedSkills: string[];
  derivedBonus: string[];
}

export const CANDIDATE_SEARCH_PAGE_SIZES = [10, 25, 50, 100] as const;
export const CANDIDATE_SEARCH_DEFAULT_PAGE_SIZE = 25;

/** Rows-per-page persists per user so someone who works at 100 is not reset. */
export const PAGE_SIZE_STORAGE_KEY = "candidate-search:page-size";

export function blankCriteria(): CandidateSearchCriteria {
  return {
    query: null,
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
    // With no criteria the Match % column is not rendered, so the only honest
    // default order is newest into the pipeline.
    sort: "applied",
    sortDir: "desc",
    page: 1,
    pageSize: CANDIDATE_SEARCH_DEFAULT_PAGE_SIZE,
    origin: null,
  };
}

/** Fields that are filters. Sort and paging are excluded on purpose. */
const ARRAY_FIELDS = [
  "jobIds",
  "titles",
  "skills",
  "companies",
  "countries",
  "employmentTypes",
  "workModes",
  "educationLevels",
  "sources",
] as const;

const NUMBER_ARRAY_FIELDS = ["industryIds", "stageIds"] as const;

const SCALAR_FIELDS = ["location", "appliedFrom", "appliedTo"] as const;

const NUMBER_FIELDS = [
  "experienceMin",
  "experienceMax",
  "scoreMin",
  "scoreMax",
] as const;

/** A deep copy. The drawer must never share a reference with applied state. */
export function cloneCriteria(
  criteria: CandidateSearchCriteria
): CandidateSearchCriteria {
  return {
    ...criteria,
    jobIds: [...criteria.jobIds],
    titles: [...criteria.titles],
    skills: [...criteria.skills],
    bonus: [...criteria.bonus],
    origin: criteria.origin
      ? {
          ...criteria.origin,
          derivedSkills: [...criteria.origin.derivedSkills],
          derivedBonus: [...criteria.origin.derivedBonus],
        }
      : null,
    companies: [...criteria.companies],
    industryIds: [...criteria.industryIds],
    countries: [...criteria.countries],
    employmentTypes: [...criteria.employmentTypes],
    workModes: [...criteria.workModes],
    stageIds: [...criteria.stageIds],
    educationLevels: [...criteria.educationLevels],
    sources: [...criteria.sources],
  };
}

/**
 * Total applied criteria, and how many of them the score can differentiate on.
 *
 * `total === 0` suppresses the Match % and Why columns — 0 ÷ 0 has no honest
 * answer. Any criterion at all brings them back, and a facets-only search
 * correctly reads 100% for every survivor.
 */
export function countAppliedCriteria(c: CandidateSearchCriteria): number {
  let total = 0;
  for (const field of ARRAY_FIELDS) total += c[field].length;
  for (const field of NUMBER_ARRAY_FIELDS) total += c[field].length;
  for (const field of SCALAR_FIELDS) if (c[field]) total += 1;
  for (const field of NUMBER_FIELDS) if (c[field] !== null) total += 1;
  if (c.query) total += 1;
  return total;
}

/**
 * Keeps sort aligned with whether Match % is meaningful. Only runs on the
 * 0↔>0 criteria transitions — never overrides an explicit Experience/Applied
 * choice while criteria remain applied.
 */
export function syncSortForCriteriaChange(
  beforeCount: number,
  afterCount: number,
  criteria: CandidateSearchCriteria
): void {
  if (beforeCount === 0 && afterCount > 0 && criteria.sort === "applied") {
    criteria.sort = "fit";
    criteria.sortDir = "desc";
  } else if (beforeCount > 0 && afterCount === 0) {
    criteria.sort = "applied";
    criteria.sortDir = "desc";
  }
}

/**
 * Groups with at least one active value, for the All-filters badge.
 *
 * Excludes the free-text query — it is visible in its own input — and includes
 * quick filters, because they are filters and a badge that undercounts is
 * dishonest.
 */
export function countActiveFilterGroups(c: CandidateSearchCriteria): number {
  let groups = 0;
  for (const field of ARRAY_FIELDS) if (c[field].length > 0) groups += 1;
  for (const field of NUMBER_ARRAY_FIELDS) if (c[field].length > 0) groups += 1;
  for (const field of SCALAR_FIELDS) if (c[field]) groups += 1;
  if (c.experienceMin !== null || c.experienceMax !== null) groups += 1;
  if (c.scoreMin !== null || c.scoreMax !== null) groups += 1;
  return groups;
}

/** Clearing filters must not wipe what the user typed — the box lives outside. */
export function clearFilters(
  c: CandidateSearchCriteria
): CandidateSearchCriteria {
  const cleared: CandidateSearchCriteria = {
    ...blankCriteria(),
    query: c.query,
    sort: c.sort,
    sortDir: c.sortDir,
    pageSize: c.pageSize,
  };

  // A job description is not one of "the filters I set" — it is the role being
  // matched — so Clear leaves it, exactly as it leaves the search box. Only an
  // explicit Remove drops it, and that path goes through clearOrigin.
  if (!c.origin) return cleared;

  return {
    ...cleared,
    origin: c.origin,
    skills: [...c.origin.derivedSkills],
    bonus: [...c.origin.derivedBonus],
  };
}

/**
 * Strips unset values before POSTing.
 *
 * The DTO validates with `forbidNonWhitelisted` and every filter is optional, so
 * sending `query: null` or `titles: []` is rejected outright rather than read as
 * "not applied". The criteria object keeps nulls because the UI needs a stable
 * shape; the wire does not.
 */
export function toRequestBody(
  c: CandidateSearchCriteria
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    sort: c.sort,
    sortDir: c.sortDir,
    page: c.page,
    pageSize: c.pageSize,
  };

  if (c.query) body.query = c.query;
  // Sent, but deliberately absent from ARRAY_FIELDS: bonus is not a user-set
  // filter, so it must not produce a chip or inflate the filter-group badge.
  if (c.bonus.length > 0) body.bonus = c.bonus;
  for (const field of ARRAY_FIELDS) {
    if (c[field].length > 0) body[field] = c[field];
  }
  for (const field of NUMBER_ARRAY_FIELDS) {
    if (c[field].length > 0) body[field] = c[field];
  }
  for (const field of SCALAR_FIELDS) if (c[field]) body[field] = c[field];
  for (const field of NUMBER_FIELDS) {
    if (c[field] !== null) body[field] = c[field];
  }
  return body;
}

/** `/count` is structured-only, so paging and sort are not part of its request. */
export function toCountRequestBody(
  c: CandidateSearchCriteria
): Record<string, unknown> {
  const { sort, sortDir, page, pageSize, ...rest } = toRequestBody(c);
  void sort;
  void sortDir;
  void page;
  void pageSize;
  return rest;
}

export function encodeCriteria(c: CandidateSearchCriteria): URLSearchParams {
  const params = new URLSearchParams();
  const put = (key: string, value: string) => {
    if (value) params.set(key, value);
  };

  if (c.query) put("q", c.query);
  for (const field of ARRAY_FIELDS) put(field, c[field].join(","));
  for (const field of NUMBER_ARRAY_FIELDS) put(field, c[field].join(","));
  for (const field of SCALAR_FIELDS) if (c[field]) put(field, String(c[field]));
  for (const field of NUMBER_FIELDS) {
    if (c[field] !== null) put(field, String(c[field]));
  }
  if (c.sort !== "applied") put("sort", c.sort);
  if (c.sortDir !== "desc") put("sortDir", c.sortDir);
  if (c.page > 1) put("page", String(c.page));
  if (c.pageSize !== CANDIDATE_SEARCH_DEFAULT_PAGE_SIZE) {
    put("pageSize", String(c.pageSize));
  }
  return params;
}

const SORTS: CandidateSearchSort[] = ["fit", "experience", "applied"];

/**
 * Tolerant by design: a URL can be hand-edited, shared from an older build, or
 * carry a facet that has since been renamed. Unknown or malformed values are
 * dropped so the page degrades to a valid search rather than throwing.
 */
export function decodeCriteria(
  params: URLSearchParams
): CandidateSearchCriteria {
  const c = blankCriteria();
  const list = (key: string) =>
    (params.get(key) ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

  const query = params.get("q")?.trim();
  if (query) c.query = query;

  for (const field of ARRAY_FIELDS) c[field] = list(field);
  for (const field of NUMBER_ARRAY_FIELDS) {
    c[field] = list(field)
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v));
  }
  for (const field of SCALAR_FIELDS) {
    const value = params.get(field)?.trim();
    if (value) c[field] = value;
  }
  for (const field of NUMBER_FIELDS) {
    const raw = params.get(field);
    if (raw === null) continue;
    const value = Number(raw);
    if (Number.isFinite(value)) c[field] = value;
  }

  const sort = params.get("sort") as CandidateSearchSort | null;
  if (sort && SORTS.includes(sort)) c.sort = sort;
  if (params.get("sortDir") === "asc") c.sortDir = "asc";

  const page = Number(params.get("page"));
  if (Number.isFinite(page) && page > 0) c.page = Math.floor(page);

  const pageSize = Number(params.get("pageSize"));
  if (CANDIDATE_SEARCH_PAGE_SIZES.includes(pageSize as 10 | 25 | 50 | 100)) {
    c.pageSize = pageSize;
  }

  return c;
}

/**
 * Removes a job description and everything it contributed.
 *
 * `bonus[]` has no chip of its own, so this is the only way it can go — leaving
 * it behind would mean criteria still scoring against terms the recruiter can
 * no longer see. The role title stays in the query box as ordinary text,
 * because they did type it, in effect, and losing it would be a surprise.
 */
export function clearOrigin(
  c: CandidateSearchCriteria
): CandidateSearchCriteria {
  if (!c.origin) return c;
  const derived = new Set(c.origin.derivedSkills.map((s) => s.toLowerCase()));

  return {
    ...c,
    origin: null,
    // Only the skills this JD contributed; anything hand-picked since stays.
    skills: c.skills.filter((skill) => !derived.has(skill.toLowerCase())),
    bonus: [],
  };
}

/**
 * How much of the description's must-have list is still applied, so the banner
 * can never claim more than the criteria actually carry — a recruiter who drops
 * one bad extraction should see "2 of 3", not a stale "3".
 */
export function originSkillCount(c: CandidateSearchCriteria): {
  applied: number;
  total: number;
} {
  if (!c.origin) return { applied: 0, total: 0 };
  const active = new Set(c.skills.map((s) => s.toLowerCase()));
  return {
    applied: c.origin.derivedSkills.filter((s) => active.has(s.toLowerCase()))
      .length,
    total: c.origin.derivedSkills.length,
  };
}

// ------------------------------------------------------------------ merge --

/** Trim, drop blanks, drop case-insensitive duplicates, preserve order. */
function normalise(values: string[], seen = new Set<string>()): string[] {
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

/**
 * Applied criteria + a parsed description → the criteria that will be committed.
 *
 * `clearOrigin` runs first so a second description replaces the first rather
 * than stacking on top of it — two JDs' worth of must-haves ANDed together
 * matches nobody. Hand-picked skills survive, because they were never derived.
 */
export function mergeJobDescription(
  base: CandidateSearchCriteria,
  parsed: ParsedJobDescription
): CandidateSearchCriteria {
  const next = cloneCriteria(clearOrigin(base));
  const role = parsed.role?.trim() ?? "";

  const seen = new Set(next.skills.map((s) => s.toLowerCase()));
  const derivedSkills = normalise(parsed.mustHave, seen);
  const derivedBonus = normalise(parsed.niceToHave);

  if (role) next.query = role;
  next.skills = [...next.skills, ...derivedSkills];
  // Nice-to-haves score and never filter, so they are replaced wholesale.
  next.bonus = derivedBonus;
  next.origin = {
    kind: "jd",
    title: role || "this description",
    derivedSkills,
    derivedBonus,
  };
  // Any change to applied criteria resets paging (§9.2).
  next.page = 1;
  return next;
}
