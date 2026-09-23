import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  Min,
  Max,
  ArrayMinSize,
  IsString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type, Transform } from "class-transformer";
import { TrimString } from "decorators/trim-string.decorator";
import {
  DisputeTypeEnum,
  DisputePriorityEnum,
  DisputeStatusEnum,
  DisputeSortFieldEnum,
  SortOrderEnum,
  DISPUTES_MESSAGES,
} from "./disputes.constants";

export class QueryDisputeDto {
  @ApiPropertyOptional({ description: "Page number (1-indexed)", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Items per page", default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: "Search by description or dispute type",
  })
  @IsOptional()
  @TrimString()
  search?: string;

  @ApiPropertyOptional({
    description: "Filter by introduction request ID",
  })
  @IsOptional()
  @TrimString()
  introductionRequestId?: string;

  @ApiPropertyOptional({
    description: "Filter by status",
    enum: DisputeStatusEnum,
  })
  @IsOptional()
  @IsEnum(DisputeStatusEnum, {
    message: DISPUTES_MESSAGES.VALIDATION.STATUS_INVALID,
  })
  status?: DisputeStatusEnum;

  @ApiPropertyOptional({
    description: "Filter by priority",
    enum: DisputePriorityEnum,
  })
  @IsOptional()
  @IsEnum(DisputePriorityEnum, {
    message: DISPUTES_MESSAGES.VALIDATION.PRIORITY_INVALID,
  })
  priority?: DisputePriorityEnum;

  @ApiPropertyOptional({
    description: "Filter by dispute type",
    enum: DisputeTypeEnum,
  })
  @IsOptional()
  @IsEnum(DisputeTypeEnum, {
    message: DISPUTES_MESSAGES.VALIDATION.DISPUTE_TYPE_INVALID,
  })
  disputeType?: DisputeTypeEnum;

  @ApiPropertyOptional({
    description: "Sort field",
    enum: DisputeSortFieldEnum,
    default: DisputeSortFieldEnum.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(DisputeSortFieldEnum)
  sort?: DisputeSortFieldEnum = DisputeSortFieldEnum.CREATED_AT;

  @ApiPropertyOptional({
    description: "Sort order",
    enum: SortOrderEnum,
    default: SortOrderEnum.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrderEnum)
  order?: SortOrderEnum = SortOrderEnum.DESC;

  @ApiPropertyOptional({
    description: "Enable pagination",
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value === undefined ? true : Boolean(value);
  })
  isPagination?: boolean = true;
}

export class BulkDeleteDto {
  @ApiProperty({
    description: "Array of dispute IDs to delete",
    type: [String],
  })
  @IsNotEmpty({ message: DISPUTES_MESSAGES.VALIDATION.IDS_ARRAY_REQUIRED })
  @IsArray()
  @IsString({
    each: true,
    message: DISPUTES_MESSAGES.VALIDATION.IDS_ARRAY_REQUIRED,
  })
  @ArrayMinSize(1, { message: DISPUTES_MESSAGES.VALIDATION.IDS_ARRAY_MIN })
  ids: string[];
}
