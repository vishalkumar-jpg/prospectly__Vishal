import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsUrl,
  Min,
  Max,
  Length,
  ArrayMinSize,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { TrimString } from "decorators/trim-string.decorator";
import {
  DisputeTypeEnum,
  DisputeCategoryEnum,
  DisputePriorityEnum,
  DISPUTES_MESSAGES,
} from "./disputes.constants";

export class CreateDisputeDto {
  @ApiProperty({
    description: "Introduction request ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsString()
  @IsNotEmpty({
    message: DISPUTES_MESSAGES.VALIDATION.INTRODUCTION_REQUEST_ID_REQUIRED,
  })
  @TrimString()
  introductionRequestId: string;

  @ApiProperty({
    description: "Type of dispute",
    enum: DisputeTypeEnum,
    example: DisputeTypeEnum.SERVICE_QUALITY,
  })
  @IsEnum(DisputeTypeEnum, {
    message: DISPUTES_MESSAGES.VALIDATION.DISPUTE_TYPE_INVALID,
  })
  @IsNotEmpty({ message: DISPUTES_MESSAGES.VALIDATION.DISPUTE_TYPE_REQUIRED })
  disputeType: DisputeTypeEnum;

  @ApiPropertyOptional({
    description: "Category of dispute",
    enum: DisputeCategoryEnum,
    example: DisputeCategoryEnum.SERVICE,
  })
  @IsOptional()
  @IsEnum(DisputeCategoryEnum, {
    message: DISPUTES_MESSAGES.VALIDATION.DISPUTE_CATEGORY_INVALID,
  })
  disputeCategory?: DisputeCategoryEnum;

  @ApiPropertyOptional({
    description: "Priority level",
    enum: DisputePriorityEnum,
    default: DisputePriorityEnum.MEDIUM,
  })
  @IsOptional()
  @IsEnum(DisputePriorityEnum, {
    message: DISPUTES_MESSAGES.VALIDATION.PRIORITY_INVALID,
  })
  priority?: DisputePriorityEnum = DisputePriorityEnum.MEDIUM;

  @ApiProperty({
    description: "Description of the dispute",
    example: "The connector did not show up for the scheduled meeting",
  })
  @IsString()
  @IsNotEmpty({ message: DISPUTES_MESSAGES.VALIDATION.REASON_REQUIRED })
  @Length(10, 5000, {
    message: DISPUTES_MESSAGES.VALIDATION.REASON_LENGTH,
  })
  @TrimString()
  reason: string;

  @ApiPropertyOptional({
    description: "Expected outcome",
    example: "Full refund of the bounty amount",
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000, {
    message: DISPUTES_MESSAGES.VALIDATION.EXPECTED_OUTCOME_LENGTH,
  })
  @TrimString()
  expectedOutcome?: string;

  @ApiPropertyOptional({
    description: "Array of evidence URLs",
    type: [String],
    example: ["https://example.com/evidence1.pdf"],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @IsUrl(
    {},
    { each: true, message: DISPUTES_MESSAGES.VALIDATION.EVIDENCE_URL_INVALID }
  )
  evidenceUrls?: string[];

  @ApiPropertyOptional({
    description: "Amount being disputed",
    example: 100.0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    { message: DISPUTES_MESSAGES.VALIDATION.DISPUTED_AMOUNT_NUMBER }
  )
  @Min(0, { message: DISPUTES_MESSAGES.VALIDATION.DISPUTED_AMOUNT_MIN })
  @Max(999999.99, {
    message: DISPUTES_MESSAGES.VALIDATION.DISPUTED_AMOUNT_MAX,
  })
  disputedAmount?: number;

  @ApiPropertyOptional({
    description: "Requested refund amount",
    example: 100.0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    { message: DISPUTES_MESSAGES.VALIDATION.REQUESTED_REFUND_AMOUNT_NUMBER }
  )
  @Min(0, {
    message: DISPUTES_MESSAGES.VALIDATION.REQUESTED_REFUND_AMOUNT_MIN,
  })
  @Max(999999.99, {
    message: DISPUTES_MESSAGES.VALIDATION.REQUESTED_REFUND_AMOUNT_MAX,
  })
  requestedRefundAmount?: number;
}
