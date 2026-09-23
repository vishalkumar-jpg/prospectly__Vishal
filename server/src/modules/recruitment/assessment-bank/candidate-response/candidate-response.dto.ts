import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMaxSize,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { TrimString } from "decorators/trim-string.decorator";
import {
  QUESTION_TEXT_MAX,
  OPTION_ID_MAX,
  MAX_OPTIONS_PER_QUESTION,
} from "../recruitment-assessment-bank.constants";

/** A candidate's answer to a single assessment question. */
export class CandidateAnswerDto {
  // Option ids are recruiter-defined slugs (e.g. "yes"), not UUIDs, so they
  // are bounded by count + length rather than validated as UUIDs.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_OPTIONS_PER_QUESTION)
  @IsString({ each: true })
  @MaxLength(OPTION_ID_MAX, { each: true })
  selectedOptionIds?: string[];

  @IsOptional()
  @IsString()
  @TrimString()
  @MaxLength(QUESTION_TEXT_MAX)
  text?: string;
}

/** One entry in the `assessmentResponses` array on the apply payloads. */
export class AssessmentResponseInputDto {
  @IsUUID("4")
  jobQuestionId: string;

  @ValidateNested()
  @Type(() => CandidateAnswerDto)
  answer: CandidateAnswerDto;
}
