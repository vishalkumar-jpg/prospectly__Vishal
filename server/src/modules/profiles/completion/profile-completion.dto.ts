import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateIf,
} from "class-validator";
import { SUPPORTED_PAYOUT_COUNTRIES } from "config/payment.config";
import {
  ORGANIZATION_NAME_MAX_LENGTH,
  ORGANIZATION_NAME_MIN_LENGTH,
  ORGANIZATION_NAME_PATTERN,
  PROFILE_COMPLETION_MESSAGES,
} from "./profile-completion.constants";

const normalizeOrganizationName = (value: unknown) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;

/**
 * Generic profile-completion payload. Every field is individually optional so
 * the client can submit one step at a time; the service rejects a payload that
 * contributes nothing.
 */
export class UpdateProfileCompletionDto {
  @ApiPropertyOptional({
    example: "IN",
    description:
      "ISO 3166-1 alpha-2 payout country. Supported: US, IN, PH, MX, ZA.",
  })
  // `@ValidateIf` rather than `@IsOptional`, which also skips validation for an
  // explicit null and would let it through to wipe a country that was already
  // set. Only an absent key skips these checks.
  @ValidateIf((dto: UpdateProfileCompletionDto) => dto.country !== undefined)
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value
  )
  // Decorators apply bottom-up, so class-validator reports the last one first.
  // `@IsIn` sits above `@IsNotEmpty` to keep "select your country" ahead of
  // "unsupported country" for a blank value, which is the more useful message.
  @IsIn([...SUPPORTED_PAYOUT_COUNTRIES], {
    message: PROFILE_COMPLETION_MESSAGES.ERROR.COUNTRY_INVALID,
  })
  @IsNotEmpty({ message: PROFILE_COMPLETION_MESSAGES.ERROR.COUNTRY_REQUIRED })
  country?: string;

  @ApiPropertyOptional({ description: "Existing organization to join." })
  @IsOptional()
  @IsUUID(undefined, {
    message: PROFILE_COMPLETION_MESSAGES.ERROR.ORGANIZATION_NOT_FOUND,
  })
  organizationId?: string;

  @ApiPropertyOptional({
    example: "Acme Corp",
    description: "Name of a new organization to create as pending approval.",
  })
  @IsOptional()
  @Transform(({ value }) => normalizeOrganizationName(value))
  @IsString({
    message: PROFILE_COMPLETION_MESSAGES.ERROR.ORGANIZATION_NAME_INVALID,
  })
  @Length(ORGANIZATION_NAME_MIN_LENGTH, ORGANIZATION_NAME_MAX_LENGTH, {
    message: PROFILE_COMPLETION_MESSAGES.ERROR.ORGANIZATION_NAME_INVALID,
  })
  @Matches(ORGANIZATION_NAME_PATTERN, {
    message: PROFILE_COMPLETION_MESSAGES.ERROR.ORGANIZATION_NAME_INVALID,
  })
  organizationName?: string;

  @ApiPropertyOptional({
    description: "Records that the user declined to select an organization.",
  })
  @IsOptional()
  @IsBoolean()
  skipOrganization?: boolean;
}

export class GetCompletionOrganizationsQueryDto {
  @ApiPropertyOptional({ description: "Case-insensitive name search." })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: "1" })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ example: "20" })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
