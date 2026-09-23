import {
  IsUUID,
  Equals,
  IsString,
  IsNumber,
  IsEmail,
  IsNotEmpty,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { isDisposableEmail } from "./connector-upload.constants";

@ValidatorConstraint({ name: "IsNotDisposableEmail", async: false })
class IsNotDisposableEmailConstraint implements ValidatorConstraintInterface {
  validate(email: unknown): boolean {
    if (typeof email !== "string") return false;
    return !isDisposableEmail(email);
  }
  defaultMessage(): string {
    return "Disposable email addresses are not allowed";
  }
}

@ValidatorConstraint({ name: "HasUniqueEmails", async: false })
class HasUniqueEmailsConstraint implements ValidatorConstraintInterface {
  validate(files: unknown): boolean {
    if (!Array.isArray(files)) return false;
    const seen = new Set<string>();
    for (const f of files) {
      const email =
        typeof f?.email === "string" ? f.email.trim().toLowerCase() : "";
      if (!email) continue;
      if (seen.has(email)) return false;
      seen.add(email);
    }
    return true;
  }
  defaultMessage(_args: ValidationArguments): string {
    return "Duplicate email detected in the same upload";
  }
}

export class ResumeFileDto {
  @IsString()
  fileName: string;

  @IsString()
  filePath: string;

  @IsString()
  mimeType: string;

  @IsString()
  fileType: string;

  @IsNumber()
  @Type(() => Number)
  size: number;

  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value
  )
  @IsEmail()
  @Validate(IsNotDisposableEmailConstraint)
  email: string;
}

export class ConnectorUploadDto {
  @IsUUID()
  jobId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @Type(() => ResumeFileDto)
  @Validate(HasUniqueEmailsConstraint)
  files: ResumeFileDto[];

  @Equals(true, { message: "Confirmation is required" })
  piiConsent: boolean;
}
