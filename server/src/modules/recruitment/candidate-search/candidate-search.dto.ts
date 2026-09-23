import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { OmitType } from "@nestjs/swagger";
import { TrimArrayString, TrimString } from "decorators/trim-string.decorator";
import { RESUME_SEARCH_MAX_QUERY_LENGTH } from "modules/recruitment/resume-search/resume-search.constants";
import { SAVED_SEARCH_SOURCES } from "database/schema/recruitment-saved-searches";
import type { CandidateSearchSort } from "./candidate-search.constants";
import {
  CANDIDATE_SEARCH_EDUCATION_LEVELS,
  CANDIDATE_SEARCH_EMPLOYMENT_TYPES,
  CANDIDATE_SEARCH_JD_MAX_LENGTH,
  CANDIDATE_SEARCH_JD_MIN_LENGTH,
  CANDIDATE_SEARCH_MAX_ARRAY_SIZE,
  CANDIDATE_SEARCH_MAX_EXPERIENCE_YEARS,
  CANDIDATE_SEARCH_MAX_JOB_IDS,
  CANDIDATE_SEARCH_MAX_PAGE_SIZE,
  CANDIDATE_SEARCH_MAX_TEXT_LENGTH,
  CANDIDATE_SEARCH_SORTS,
  CANDIDATE_SEARCH_WORK_MODES,
  SAVED_SEARCH_TITLE_MAX_LENGTH,
} from "./candidate-search.constants";

/**
 * Wire format for cross-job candidate search.
 *
 * Cross-field rules (`experienceMin <= experienceMax`, `appliedFrom <=
 * appliedTo`, `scoreMin <= scoreMax`) are deliberately NOT here: they are
 * domain logic, and the normaliser is the one place that must also run over
 * stored criteria a follow-on introduces (plan §10.3).
 *
 * `searchField` and `queryMode` are absent by design (§7.8, §12) — the single
 * input searches every field, and Boolean mode is a follow-on. Recorded so
 * nobody restores them.
 */
export class CandidateSearchDto {
  /** Same ceiling as job-scoped résumé search — one embedding budget, one limit. */
  @IsOptional()
  @TrimString()
  @MaxLength(RESUME_SEARCH_MAX_QUERY_LENGTH)
  query?: string;

  /** Scope group. Empty/absent = every accessible posting, never "no postings". */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CANDIDATE_SEARCH_MAX_JOB_IDS)
  @IsUUID("all", { each: true })
  jobIds?: string[];

  @IsOptional()
  @ArrayMaxSize(CANDIDATE_SEARCH_MAX_ARRAY_SIZE)
  @MaxLength(CANDIDATE_SEARCH_MAX_TEXT_LENGTH, { each: true })
  @TrimArrayString()
  titles?: string[];

  @IsOptional()
  @ArrayMaxSize(CANDIDATE_SEARCH_MAX_ARRAY_SIZE)
  @MaxLength(CANDIDATE_SEARCH_MAX_TEXT_LENGTH, { each: true })
  @TrimArrayString()
  skills?: string[];

  /**
   * Nice-to-haves from a job description. Scored, never filtered — accepted
   * here so a committed JD survives a page reload through the URL.
   */
  @IsOptional()
  @ArrayMaxSize(CANDIDATE_SEARCH_MAX_ARRAY_SIZE)
  @MaxLength(CANDIDATE_SEARCH_MAX_TEXT_LENGTH, { each: true })
  @TrimArrayString()
  bonus?: string[];

  @IsOptional()
  @ArrayMaxSize(CANDIDATE_SEARCH_MAX_ARRAY_SIZE)
  @MaxLength(CANDIDATE_SEARCH_MAX_TEXT_LENGTH, { each: true })
  @TrimArrayString()
  companies?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CANDIDATE_SEARCH_MAX_ARRAY_SIZE)
  @IsInt({ each: true })
  industryIds?: number[];

  @IsOptional()
  @ArrayMaxSize(CANDIDATE_SEARCH_MAX_ARRAY_SIZE)
  @MaxLength(CANDIDATE_SEARCH_MAX_TEXT_LENGTH, { each: true })
  @TrimArrayString()
  countries?: string[];

  @IsOptional()
  @TrimString()
  @MaxLength(CANDIDATE_SEARCH_MAX_TEXT_LENGTH)
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(CANDIDATE_SEARCH_MAX_EXPERIENCE_YEARS)
  experienceMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(CANDIDATE_SEARCH_MAX_EXPERIENCE_YEARS)
  experienceMax?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  scoreMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  scoreMax?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CANDIDATE_SEARCH_MAX_ARRAY_SIZE)
  @IsIn([...CANDIDATE_SEARCH_EMPLOYMENT_TYPES], { each: true })
  employmentTypes?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CANDIDATE_SEARCH_MAX_ARRAY_SIZE)
  @IsIn([...CANDIDATE_SEARCH_WORK_MODES], { each: true })
  workModes?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CANDIDATE_SEARCH_MAX_ARRAY_SIZE)
  @IsInt({ each: true })
  stageIds?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CANDIDATE_SEARCH_MAX_ARRAY_SIZE)
  @IsIn([...CANDIDATE_SEARCH_EDUCATION_LEVELS], { each: true })
  educationLevels?: string[];

  @IsOptional()
  @ArrayMaxSize(CANDIDATE_SEARCH_MAX_ARRAY_SIZE)
  @MaxLength(CANDIDATE_SEARCH_MAX_TEXT_LENGTH, { each: true })
  @TrimArrayString()
  sources?: string[];

  @IsOptional()
  @IsDateString()
  appliedFrom?: string;

  @IsOptional()
  @IsDateString()
  appliedTo?: string;

  @IsOptional()
  @IsIn([...CANDIDATE_SEARCH_SORTS])
  sort?: CandidateSearchSort;

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortDir?: "asc" | "desc";

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  /** Ceiling shared with the client's largest page-size option, or it 400s. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(CANDIDATE_SEARCH_MAX_PAGE_SIZE)
  pageSize?: number;
}

/**
 * Same criteria, no presentation: `/count` answers "how many match?" for the
 * drawer footer, so paging and sorting would be meaningless input — and with
 * `forbidNonWhitelisted` they are rejected rather than silently ignored.
 */
export class CandidateSearchCountDto extends OmitType(CandidateSearchDto, [
  "sort",
  "sortDir",
  "page",
  "pageSize",
] as const) {}

/**
 * `/facets` is scoped entirely by the authenticated user (§5.3) and takes no
 * input. The empty class is what makes `forbidNonWhitelisted` reject a stray
 * query param instead of ignoring it.
 */
export class CandidateSearchFacetsDto {}

/**
 * A pasted job description. The minimum is a guard against a paste accident —
 * a two-line fragment produces a confident extraction from almost nothing,
 * which is worse than refusing.
 */
export class CandidateSearchJdParseDto {
  @IsString()
  @MinLength(CANDIDATE_SEARCH_JD_MIN_LENGTH)
  @MaxLength(CANDIDATE_SEARCH_JD_MAX_LENGTH)
  text!: string;
}

export class SavedSearchCreateDto {
  @IsString()
  @TrimString()
  @MinLength(1)
  @MaxLength(SAVED_SEARCH_TITLE_MAX_LENGTH)
  title!: string;

  /**
   * Untyped on purpose. It is normalised on the way in and again on the way
   * out, so validating a second shape here would be a third place for the
   * criteria contract to drift.
   */
  @IsObject()
  criteria!: Record<string, unknown>;

  @IsOptional()
  @IsIn([...SAVED_SEARCH_SOURCES])
  source?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  resultCountAtSave?: number;
}

export class SavedSearchRenameDto {
  @IsString()
  @TrimString()
  @MinLength(1)
  @MaxLength(SAVED_SEARCH_TITLE_MAX_LENGTH)
  title!: string;
}

export class SavedSearchFavoriteDto {
  @IsBoolean()
  isFavorite!: boolean;
}
