import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  MaxLength,
  IsNumber,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TrimString } from "decorators/trim-string.decorator";

export class StartClaimDto {
  @ApiProperty({ description: "ID of the introduction request to claim" })
  @IsNotEmpty()
  @IsUUID()
  requestId: string;

  @ApiProperty({ description: "Sharer code from the share link" })
  @IsNotEmpty()
  @MaxLength(50)
  @TrimString()
  sharerCode: string;

  @ApiPropertyOptional({
    description: "reCAPTCHA v3 token (optional for authenticated users)",
  })
  @IsOptional()
  @TrimString()
  captchaToken?: string;

  @ApiPropertyOptional({ description: "Honeypot field - must be empty" })
  @IsOptional()
  @MaxLength(0)
  honeypotField?: string;
}

export class VerifyClaimDto {
  @ApiProperty({ description: "ID of the claim to verify" })
  @IsNotEmpty()
  @IsUUID()
  claimId: string;

  @ApiProperty({ description: "Contact ID from user's imported contacts" })
  @IsNotEmpty()
  @IsNumber()
  prospectContactId: number;
}

export class CompleteClaimDto {
  @ApiProperty({ description: "ID of the claim to complete" })
  @IsNotEmpty()
  @IsUUID()
  claimId: string;
}

export class ClaimResponseDto {
  claimId: string;
  status: string;
  message: string;
}

export class ClaimVerificationResponseDto {
  verified: boolean;
  claimId: string;
  status: string;
  claimerShare?: number;
  sharerShare?: number;
  message: string;
}

export class GetMyClaimsQueryDto {
  @ApiPropertyOptional({ default: "1" })
  @IsOptional()
  @TrimString()
  page?: string;

  @ApiPropertyOptional({ default: "20" })
  @IsOptional()
  @TrimString()
  limit?: string;
}
