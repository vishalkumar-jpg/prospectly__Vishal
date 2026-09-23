import {
  IsArray,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
  IsNumberString,
  IsString,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TrimString } from "decorators/trim-string.decorator";
import { MAX_NOTIFY_ORGANISATIONS } from "./recruitment-notifications.constants";

/** Accepts a repeated query param or a comma-separated string and yields a UUID array. */
const toUuidArray = ({ value }: { value: unknown }): unknown => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return value;
};

export class SendJobNotificationDto {
  @ApiProperty({
    description: "Organizations whose members should be emailed",
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_NOTIFY_ORGANISATIONS)
  @IsUUID("4", { each: true })
  organisationIds: string[];
}

export class GetOrganisationsQueryDto {
  @ApiPropertyOptional({ description: "Search organizations by name" })
  @IsOptional()
  @IsString()
  @TrimString()
  search?: string;

  @ApiPropertyOptional({ default: "1" })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ default: "20" })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}

export class NotifyPreviewQueryDto {
  @ApiProperty({
    description:
      "Organization IDs (repeated query param or comma-separated string)",
    type: [String],
  })
  @Transform(toUuidArray)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_NOTIFY_ORGANISATIONS)
  @IsUUID("4", { each: true })
  organisationIds: string[];
}
