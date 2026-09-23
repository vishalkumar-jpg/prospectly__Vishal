import {
  IsOptional,
  IsInt,
  IsIn,
  IsBoolean,
  IsString,
  IsUUID,
  IsArray,
  IsNumberString,
  ValidateNested,
  ArrayMaxSize,
  Min,
  Max,
  MinLength,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { TrimString } from "decorators/trim-string.decorator";
import {
  ASSESSMENT_QUESTION_TYPES,
  QUESTION_TEXT_MIN,
  QUESTION_TEXT_MAX,
  OPTION_LABEL_MAX,
  MAX_OPTIONS_PER_QUESTION,
  MAX_QUESTIONS_PER_JOB,
} from "./recruitment-assessment-bank.constants";

export class AssessmentOptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  id?: string;

  @IsString()
  @TrimString()
  @MinLength(1)
  @MaxLength(OPTION_LABEL_MAX)
  label: string;

  @IsOptional()
  @IsInt()
  orderIndex?: number;

  @IsOptional()
  @IsInt()
  value?: number;
}

export class AssessmentCorrectAnswerDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionIds?: string[];

  @IsOptional()
  @IsString()
  @TrimString()
  @MaxLength(QUESTION_TEXT_MAX)
  text?: string;
}

/** Base fields shared by bank questions and per-job questions. */
export class AssessmentQuestionBaseDto {
  @IsString()
  @TrimString()
  @MinLength(QUESTION_TEXT_MIN)
  @MaxLength(QUESTION_TEXT_MAX)
  questionText: string;

  @IsOptional()
  @IsIn(ASSESSMENT_QUESTION_TYPES)
  questionType?: (typeof ASSESSMENT_QUESTION_TYPES)[number];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(MAX_OPTIONS_PER_QUESTION)
  @Type(() => AssessmentOptionDto)
  options?: AssessmentOptionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AssessmentCorrectAnswerDto)
  correctAnswer?: AssessmentCorrectAnswerDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  points?: number;
}

export class ListBankQuestionsDto {
  @IsOptional()
  @TrimString()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}

/** Query for case-insensitive bank question text uniqueness check. */
export class BankQuestionExistsDto {
  @IsString()
  @TrimString()
  @MinLength(QUESTION_TEXT_MIN)
  @MaxLength(QUESTION_TEXT_MAX)
  questionText: string;
}

/**
 * A per-job assessment question sent inside Create/Update job payloads.
 * Carries resolved values directly (copy-on-add). `sourceBankQuestionId` is
 * provenance only; `saveToBank` promotes an inline question into the bank.
 */
export class JobAssessmentQuestionDto extends AssessmentQuestionBaseDto {
  /** Existing job-question row id (edit flow). Omit for newly added questions. */
  @IsOptional()
  @IsUUID("4")
  id?: string;

  @IsOptional()
  @IsUUID("4")
  sourceBankQuestionId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  saveToBank?: boolean;
}

/** Reusable validator pieces for the `assessmentQuestions` array on job DTOs. */
export const JOB_ASSESSMENT_QUESTIONS_MAX = MAX_QUESTIONS_PER_JOB;
