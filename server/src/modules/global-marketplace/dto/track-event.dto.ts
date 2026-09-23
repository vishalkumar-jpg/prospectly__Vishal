import {
  IsNotEmpty,
  IsIn,
  IsOptional,
  MaxLength,
  IsObject,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TrimString } from "decorators/trim-string.decorator";

export const EVENT_TYPES = [
  "view",
  "click",
  "signup_start",
  "signup_complete",
  "claim_start",
  "claim_verify_start",
  "claim_verify_complete",
  "claim_complete",
  "claim_failed",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export class TrackEventDto {
  @ApiProperty({
    enum: EVENT_TYPES,
    description: "Type of event being tracked",
  })
  @IsNotEmpty()
  @IsIn(EVENT_TYPES)
  eventType: EventType;

  @ApiPropertyOptional({
    description: "Sharer code from the share link (set from URL param)",
  })
  @IsOptional()
  @MaxLength(50)
  @TrimString()
  sharerCode?: string;

  @ApiPropertyOptional({ description: "Additional event metadata" })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Honeypot field - must be empty" })
  @IsOptional()
  @MaxLength(0)
  honeypotField?: string;
}

export class TrackEventResponseDto {
  success: boolean;
  eventId?: number;
}
