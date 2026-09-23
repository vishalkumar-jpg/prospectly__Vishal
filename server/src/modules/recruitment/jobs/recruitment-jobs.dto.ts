import {
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  IsIn,
  IsNumberString,
  IsArray,
  IsUUID,
  ValidateIf,
  Min,
  Max,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  ValidateNested,
} from "class-validator";
import { RECRUITMENT_EMPLOYMENT_TYPES } from "database/schema/recruitment-jobs";
import { TrimString, TrimArrayString } from "decorators/trim-string.decorator";
import { IsRichTextLength } from "decorators/rich-text-length.decorator";
import { Transform, Type } from "class-transformer";
import { SUPPORTED_PAYOUT_COUNTRIES } from "config/payment.config";
import { JOB_CLOSE_CANDIDATE_STAGE_OPTIONS } from "./job-close-notification.constants";
import {
  SALARY_MAX_CAP,
  SUCCESS_FEE_MAX,
  PROBATION_PERIOD_MAX_DAYS,
  CONNECTOR_PAYOUT_WAIT_MAX_DAYS,
  JOB_SKILLS_PER_LIST_MAX,
} from "./recruitment-jobs.constants";
import { ConnectorWaitDaysMatchesFlagFor } from "./connector-wait-days.validator";
import { parseCountriesQueryParam } from "../recruitment-country-filter.utils";
import { MAX_NOTIFY_ORGANISATIONS } from "../notifications/recruitment-notifications.constants";
import { VALID_SALARY_PERIODS } from "../interview-cost/interview-cost.constants";
import {
  SALARY_CURRENCIES,
  type SalaryCurrencyCode,
} from "../recruitment-salary-currency";
import {
  JobAssessmentQuestionDto,
  JOB_ASSESSMENT_QUESTIONS_MAX,
} from "../assessment-bank/recruitment-assessment-bank.dto";

export class CreateRecruitmentJobDto {
  @IsNotEmpty()
  @TrimString()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @IsNotEmpty()
  @TrimString()
  @IsRichTextLength(50, 5000)
  description: string;

  @IsNotEmpty()
  @TrimString()
  @MinLength(5)
  @MaxLength(255)
  companyName: string;

  @IsNotEmpty()
  @TrimString()
  @IsRichTextLength(50, 5000)
  requirements: string;

  @IsNotEmpty()
  @TrimString()
  @MaxLength(50)
  experienceLevel: string;

  @IsNotEmpty()
  @IsInt()
  industryId: number;

  @IsNotEmpty()
  @IsInt()
  departmentId: number;

  // Salary range is optional — HR may post without it. When provided, both min
  // and max are required together (enforced in the create service). Persisted as
  // 0/0 when omitted.
  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  @Max(SALARY_MAX_CAP)
  salaryRangeMin?: number;

  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  @Max(SALARY_MAX_CAP)
  salaryRangeMax?: number;

  /** Required for the Flat Referral Model. Fees/publish charge are computed server-side. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(SUCCESS_FEE_MAX)
  flatReferralAmount?: number;

  @IsOptional()
  @TrimString()
  @MaxLength(255)
  salaryRangeNotes?: string;

  @ArrayMinSize(1)
  @ArrayMaxSize(JOB_SKILLS_PER_LIST_MAX)
  @TrimArrayString()
  requiredSkills: string[];

  @IsOptional()
  @ArrayMaxSize(JOB_SKILLS_PER_LIST_MAX)
  @TrimArrayString()
  preferredSkills?: string[];

  @IsNotEmpty()
  @TrimString()
  @MaxLength(50)
  workType: string;

  /** Optional: a posting that never stated its terms is left null, not guessed. */
  @IsOptional()
  @TrimString()
  @IsIn([...RECRUITMENT_EMPLOYMENT_TYPES])
  employmentType?: string;

  @IsNotEmpty()
  @TrimString()
  @MinLength(5)
  @MaxLength(255)
  location: string;

  /** Supported payout countries; at least one required. */
  @ArrayMinSize(1)
  @ArrayMaxSize(SUPPORTED_PAYOUT_COUNTRIES.length)
  @ArrayUnique()
  @TrimArrayString()
  @IsIn([...SUPPORTED_PAYOUT_COUNTRIES], {
    each: true,
    message: "each country must be one of: US, IN, PH, MX, ZA",
  })
  countries: string[];

  @IsOptional()
  @TrimString()
  @IsRichTextLength(50, 5000, { allowEmpty: true })
  responsibilities?: string;

  @IsOptional()
  @TrimString()
  @IsRichTextLength(50, 5000, { allowEmpty: true })
  benefits?: string;

  @IsOptional()
  @IsIn([...SALARY_CURRENCIES])
  @MaxLength(10)
  salaryCurrency?: SalaryCurrencyCode;

  @IsOptional()
  @TrimString()
  @IsIn(VALID_SALARY_PERIODS)
  @MaxLength(20)
  salaryPeriod?: string;

  @IsOptional()
  @IsIn(["manual", "url", "pdf"])
  creationMethod?: string;

  @IsOptional()
  @TrimString()
  @MaxLength(2048)
  sourceUrl?: string;

  @IsOptional()
  @TrimString()
  @MaxLength(500)
  companyWebsite?: string;

  @IsOptional()
  @IsBoolean()
  hasSuccessFee?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(SUCCESS_FEE_MAX)
  successFeeAmount?: number;

  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  @Max(PROBATION_PERIOD_MAX_DAYS)
  probationPeriodDays?: number;

  @IsOptional()
  @IsBoolean()
  intPayoutWaits?: boolean;

  @IsOptional()
  @IsBoolean()
  extPayoutWaits?: boolean;

  // Cross-field: required (1..MAX) when the type waits, forbidden otherwise.
  @ConnectorWaitDaysMatchesFlagFor("intPayoutWaits")
  intConnectorPayoutWaitDays?: number;

  @ConnectorWaitDaysMatchesFlagFor("extPayoutWaits")
  extConnectorPayoutWaitDays?: number;

  /** When true, emails members of the selected organisations about this job. */
  @IsOptional()
  @IsBoolean()
  notifyUsers?: boolean;

  /** Required (non-empty) when notifyUsers is true. */
  @ValidateIf((dto: CreateRecruitmentJobDto) => dto.notifyUsers === true)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_NOTIFY_ORGANISATIONS)
  @IsUUID("4", { each: true })
  organisationIds?: string[];

  /** Whether this job carries assessment/screening questions. */
  @IsOptional()
  @IsBoolean()
  hasAssessment?: boolean;

  /** Optional per-job assessment questions (ordered). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(JOB_ASSESSMENT_QUESTIONS_MAX)
  @Type(() => JobAssessmentQuestionDto)
  assessmentQuestions?: JobAssessmentQuestionDto[];
}

export class UpdateRecruitmentJobDto {
  @IsOptional()
  @TrimString()
  @MinLength(5)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @TrimString()
  @MinLength(5)
  @MaxLength(255)
  companyName?: string;

  @IsOptional()
  @TrimString()
  @MinLength(5)
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @ArrayMinSize(1)
  @ArrayMaxSize(SUPPORTED_PAYOUT_COUNTRIES.length)
  @ArrayUnique()
  @TrimArrayString()
  @IsIn([...SUPPORTED_PAYOUT_COUNTRIES], {
    each: true,
    message: "each country must be one of: US, IN, PH, MX, ZA",
  })
  countries?: string[];

  @IsOptional()
  @TrimString()
  @MaxLength(50)
  workType?: string;

  @IsOptional()
  @TrimString()
  @IsIn([...RECRUITMENT_EMPLOYMENT_TYPES])
  employmentType?: string;

  @IsOptional()
  @TrimString()
  @MaxLength(50)
  experienceLevel?: string;

  @IsOptional()
  @IsInt()
  industryId?: number;

  @IsOptional()
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @TrimString()
  @IsRichTextLength(50, 5000, { allowEmpty: true })
  description?: string;

  @IsOptional()
  @TrimString()
  @IsRichTextLength(50, 5000, { allowEmpty: true })
  requirements?: string;

  @IsOptional()
  @TrimString()
  @IsRichTextLength(50, 5000, { allowEmpty: true })
  responsibilities?: string;

  @IsOptional()
  @TrimString()
  @IsRichTextLength(50, 5000, { allowEmpty: true })
  benefits?: string;

  @IsOptional()
  @TrimString()
  @MaxLength(500)
  companyWebsite?: string;

  @IsOptional()
  @ArrayMinSize(1)
  @ArrayMaxSize(JOB_SKILLS_PER_LIST_MAX)
  @TrimArrayString()
  requiredSkills?: string[];

  @IsOptional()
  @ArrayMaxSize(JOB_SKILLS_PER_LIST_MAX)
  @TrimArrayString()
  preferredSkills?: string[];

  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  @Max(SALARY_MAX_CAP)
  salaryRangeMin?: number;

  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  @Max(SALARY_MAX_CAP)
  salaryRangeMax?: number;

  @IsOptional()
  @IsIn([...SALARY_CURRENCIES])
  @MaxLength(10)
  salaryCurrency?: SalaryCurrencyCode;

  @IsOptional()
  @TrimString()
  @IsIn(VALID_SALARY_PERIODS)
  @MaxLength(20)
  salaryPeriod?: string;

  @IsOptional()
  @TrimString()
  @MaxLength(255)
  salaryRangeNotes?: string;

  /**
   * New Flat Referral Fee. When provided, the server recomputes and persists the
   * flat pricing snapshot; Stripe/application/publish fees are computed
   * server-side, so the client never supplies them. Rejected (400) on closed jobs
   * (enforced in the update service).
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(SUCCESS_FEE_MAX)
  flatReferralAmount?: number;

  /**
   * Enable a Success Fee on a job that launched without one. Only `false → true`
   * is honoured; disabling an existing Success Fee is rejected (400) in the
   * update service.
   */
  @IsOptional()
  @IsBoolean()
  hasSuccessFee?: boolean;

  /**
   * New Success Fee amount (paid 100% to the candidate). Required when enabling a
   * Success Fee; when the fee already exists, updating this re-prices every
   * un-released candidate bonus to the latest value at release. Rejected on
   * closed jobs (enforced in the update service).
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(SUCCESS_FEE_MAX)
  successFeeAmount?: number;

  /** Probation window (days from hire) before a candidate bonus can be released. */
  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  @Max(PROBATION_PERIOD_MAX_DAYS)
  probationPeriodDays?: number;

  /**
   * Connector payout timing — editable after creation. Internal values are
   * re-derived from the org config server-side when an admin default is set.
   */
  @IsOptional()
  @IsBoolean()
  intPayoutWaits?: boolean;

  @IsOptional()
  @IsBoolean()
  extPayoutWaits?: boolean;

  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  @Max(CONNECTOR_PAYOUT_WAIT_MAX_DAYS)
  intConnectorPayoutWaitDays?: number;

  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  @Max(CONNECTOR_PAYOUT_WAIT_MAX_DAYS)
  extConnectorPayoutWaitDays?: number;

  /** Whether this job carries assessment/screening questions. */
  @IsOptional()
  @IsBoolean()
  hasAssessment?: boolean;

  /**
   * Full desired set of per-job assessment questions (ordered). When provided,
   * the server diff-syncs: rows not present are soft-deleted, the rest upserted.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(JOB_ASSESSMENT_QUESTIONS_MAX)
  @Type(() => JobAssessmentQuestionDto)
  assessmentQuestions?: JobAssessmentQuestionDto[];
}

export class CloseRecruitmentJobDto {
  @IsNotEmpty()
  @TrimString()
  @MinLength(50)
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsBoolean()
  sendNotifications?: boolean;

  @ValidateIf((dto) => dto.sendNotifications === true)
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn([...JOB_CLOSE_CANDIDATE_STAGE_OPTIONS], { each: true })
  candidateStageKeys?: string[];
}

export class ReopenRecruitmentJobDto {
  @IsOptional()
  @IsBoolean()
  sendNotifications?: boolean;

  @ValidateIf((dto) => dto.sendNotifications === true)
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn([...JOB_CLOSE_CANDIDATE_STAGE_OPTIONS], { each: true })
  candidateStageKeys?: string[];
}

export class GetJobQueryDto {
  @IsOptional()
  @IsIn(["full", "pipeline"])
  view?: "full" | "pipeline";
}

const toCountryCodeArray = ({ value }: { value: unknown }): unknown => {
  if (value == null || value === "") return undefined;
  if (Array.isArray(value)) return parseCountriesQueryParam(value);
  if (typeof value === "string") return parseCountriesQueryParam(value);
  return value;
};

export class GetRecruitmentJobsQueryDto {
  @IsOptional()
  @IsIn(["active", "closed"])
  status?: string;

  @IsOptional()
  @TrimString()
  search?: string;

  @IsOptional()
  @Transform(toCountryCodeArray)
  @IsArray()
  @ArrayUnique()
  @IsIn([...SUPPORTED_PAYOUT_COUNTRIES], { each: true })
  countries?: string[];

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
