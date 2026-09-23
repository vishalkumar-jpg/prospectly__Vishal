import {
  IsUUID,
  IsString,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  MaxLength,
  ValidateNested,
  IsNotEmpty,
  MinLength,
  ValidateIf,
  IsIn,
  IsEmail,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { TrimString } from "decorators/trim-string.decorator";
import { CreateMediaDto } from "modules/media/media.dto";
import { AssessmentResponseInputDto } from "modules/recruitment/assessment-bank/candidate-response/candidate-response.dto";
import { JOB_ASSESSMENT_QUESTIONS_MAX } from "modules/recruitment/assessment-bank/recruitment-assessment-bank.dto";
import { SUPPORTED_PAYOUT_COUNTRIES } from "config/payment.config";
import { isDisposableEmail } from "modules/recruitment/connector-upload/connector-upload.constants";
import { CONSENT_DECLINE_REASONS } from "./consent.constants";

@ValidatorConstraint({ name: "ConsentIsNotDisposableEmail", async: false })
class IsNotDisposableEmailConstraint implements ValidatorConstraintInterface {
  validate(email: unknown): boolean {
    if (typeof email !== "string") return false;
    return !isDisposableEmail(email);
  }
  defaultMessage(): string {
    return "Disposable email addresses are not allowed";
  }
}

export class SendConsentParamDto {
  @IsUUID()
  id: string;
}

export class UpdateConsentEmailDto {
  @IsNotEmpty()
  @TrimString()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value
  )
  @IsEmail()
  @Validate(IsNotDisposableEmailConstraint)
  @MaxLength(254)
  email: string;
}

export class DeclineConsentDto {
  @IsString()
  token: string;

  @IsString()
  @TrimString()
  @IsNotEmpty()
  @IsIn([...CONSENT_DECLINE_REASONS])
  @MaxLength(100)
  reason: string;

  // Required (min 50) for "other"; optional free-text for "dont_know_connector".
  @ValidateIf((o) => o.reason === "other")
  @IsNotEmpty()
  @MinLength(50)
  @ValidateIf(
    (o) =>
      o.reason === "other" ||
      (o.reason === "dont_know_connector" &&
        o.notes != null &&
        String(o.notes).trim() !== "")
  )
  @TrimString()
  @MaxLength(500)
  @IsString()
  notes?: string;
}

export class ConsentApplyDto {
  @IsString()
  token: string;

  @IsNotEmpty({ message: "Country is required" })
  @TrimString()
  @IsString()
  @IsIn([...SUPPORTED_PAYOUT_COUNTRIES], {
    message: "Country must be one of: US, IN, PH, MX, ZA",
  })
  country: string;

  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @IsOptional()
  @IsString()
  resumeMediaId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateMediaDto)
  resume?: CreateMediaDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(JOB_ASSESSMENT_QUESTIONS_MAX)
  @ValidateNested({ each: true })
  @Type(() => AssessmentResponseInputDto)
  assessmentResponses?: AssessmentResponseInputDto[];
}

export class VerifyConsentParamDto {
  @IsString()
  token: string;
}
