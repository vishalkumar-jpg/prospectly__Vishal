import {
  IsUUID,
  Equals,
  IsString,
  IsNumber,
  IsOptional,
  IsDefined,
  IsNotEmpty,
  MaxLength,
  Matches,
  ValidateNested,
  ValidateIf,
} from "class-validator";
import { Type } from "class-transformer";
import { CONNECTOR_RESUME_S3_PATH_PATTERN } from "./connector-upload-replace.constants";

export class ReplaceResumeFileDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  @Matches(CONNECTOR_RESUME_S3_PATH_PATTERN, {
    message: "Resume file path must be a resumes/ object key",
  })
  filePath: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsString()
  @IsNotEmpty()
  fileType: string;

  @IsNumber()
  @Type(() => Number)
  size: number;
}

export class ConnectorReplaceResumeDto {
  @IsOptional()
  @IsUUID()
  matchId?: string;

  @ValidateIf((dto: ConnectorReplaceResumeDto) => !dto.matchId)
  @IsUUID()
  candidateId?: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => ReplaceResumeFileDto)
  resume: ReplaceResumeFileDto;

  @Equals(true, { message: "Confirmation is required" })
  piiConsent: boolean;
}
