import { Type } from "class-transformer";
import {
  IsArray,
  IsUrl,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMaxSize,
  MaxLength,
  ValidateNested,
  IsIn,
} from "class-validator";
import { TrimString } from "decorators/trim-string.decorator";
import { CreateMediaDto } from "modules/media/media.dto";
import { AssessmentResponseInputDto } from "modules/recruitment/assessment-bank/candidate-response/candidate-response.dto";
import { JOB_ASSESSMENT_QUESTIONS_MAX } from "modules/recruitment/assessment-bank/recruitment-assessment-bank.dto";
import { SUPPORTED_PAYOUT_COUNTRIES } from "config/payment.config";

export class ApplyToJobDto {
  @IsNotEmpty()
  @IsUUID()
  jobId: string;

  @IsNotEmpty()
  @IsString()
  @TrimString()
  @MaxLength(50)
  sharerCode: string;

  @IsNotEmpty({ message: "Country is required" })
  @TrimString()
  @IsString()
  @IsIn([...SUPPORTED_PAYOUT_COUNTRIES], {
    message: "Country must be one of: US, IN, PH, MX, ZA",
  })
  country: string;

  @IsOptional()
  @TrimString()
  @IsString()
  @MaxLength(255)
  @IsUrl()
  linkedinUrl?: string;

  @IsNotEmpty({ message: "Resume is required" })
  @ValidateNested()
  @Type(() => CreateMediaDto)
  resume: CreateMediaDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(JOB_ASSESSMENT_QUESTIONS_MAX)
  @ValidateNested({ each: true })
  @Type(() => AssessmentResponseInputDto)
  assessmentResponses?: AssessmentResponseInputDto[];
}

export class CheckApplicationQueryDto {
  @IsNotEmpty()
  @IsUUID()
  jobId: string;
}

export class GetJobCandidatesQueryDto {
  @IsOptional()
  @IsString()
  @TrimString()
  search?: string;

  @IsOptional()
  @IsString()
  @TrimString()
  stage?: string;
}
