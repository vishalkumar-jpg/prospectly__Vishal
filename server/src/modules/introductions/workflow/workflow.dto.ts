import {
  IsOptional,
  IsString,
  IsIn,
  IsNotEmpty,
  Length,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TrimString } from "decorators/trim-string.decorator";
import { FAILURE_REASONS } from "../refunds/refunds.constants";

export class AcceptIntroductionRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @TrimString()
  responderMessage?: string;
}

export class MoveToMarketplaceDto {
  // Empty DTO - no fields needed for moving to marketplace
}

export class MarkUnfulfilledDto {
  @ApiProperty({
    description: "Reason for marking the introduction as unfulfilled",
    enum: Object.values(FAILURE_REASONS),
    example: "no_response",
  })
  @IsIn(Object.values(FAILURE_REASONS), {
    message: `failureReason must be one of: ${Object.values(FAILURE_REASONS).join(", ")}`,
  })
  @TrimString()
  failureReason: string;

  @ApiProperty({
    description: "Additional notes about the failure",
    example: "Prospect did not respond after 3 follow-up attempts",
    minLength: 10,
    maxLength: 255,
  })
  @IsNotEmpty({ message: "Additional notes are required" })
  @IsString()
  @Length(10, 255, {
    message: "Additional notes must be between 10 and 255 characters",
  })
  @TrimString()
  failureNotes: string;
}
