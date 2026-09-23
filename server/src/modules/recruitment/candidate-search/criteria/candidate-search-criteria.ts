import type { CandidateSearchSort } from "../candidate-search.constants";

/**
 * The single normalised shape every layer reads. The DTO is the wire format;
 * this is what the repository, the fit scorer and the chip builder all consume,
 * so combination semantics (ADR-005) are implemented once against one type.
 *
 * Empty arrays and nulls mean "not applied" — never "match nothing".
 */
export interface NormalisedCriteria {
  /** Free text, already trimmed and length-capped. */
  query: string | null;

  /** Scope. Empty = every accessible posting, never "no postings". */
  jobIds: string[];

  titles: string[];
  skills: string[];
  /**
   * Nice-to-haves read from a job description. They contribute to `fit` but
   * never filter — a preferred skill must not exclude somebody who matches
   * everything that was actually required.
   *
   * Not a user-set filter, so it gets no removable chip; the JD banner
   * represents it instead.
   */
  bonus: string[];
  companies: string[];
  industryIds: number[];
  countries: string[];
  location: string | null;

  /** Inclusive. An unset bound is unbounded, not zero. */
  experienceMin: number | null;
  experienceMax: number | null;

  /** Applied to computed `fit`, after scoring. */
  scoreMin: number | null;
  scoreMax: number | null;

  /** Inherited from the posting, filtered by overlap (ADR-005 §7). */
  employmentTypes: string[];
  workModes: string[];

  stageIds: number[];
  educationLevels: string[];
  sources: string[];

  /** ISO dates against MIN(candidacy created_at) over in-scope postings. */
  appliedFrom: string | null;
  appliedTo: string | null;

  sort: CandidateSearchSort;
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;

  /**
   * Set when criteria came from a job description, and absent otherwise.
   *
   * It exists to resolve one otherwise-ambiguous interaction: the drawer's
   * "Clear" means "clear the filters I set", and a job description is not a
   * filter — it is the role being matched. So Clear leaves it, exactly as it
   * leaves the search box, and only an explicit Remove drops it along with
   * every criterion it contributed.
   */
  origin: CriteriaOrigin | null;
}

export interface CriteriaOrigin {
  kind: "jd";
  title: string;
  derivedSkills: string[];
  derivedBonus: string[];
}

/** Which criteria are set, and therefore whether the Match % column exists. */
export interface CriteriaSummary {
  /** Total applied criteria across every field — the fit denominator's population. */
  total: number;
  /** Skills + query terms. Zero of these means the score cannot differentiate. */
  scoreable: number;
}
