import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsNumber, IsEnum, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { TrimString } from "decorators/trim-string.decorator";
import {
  TransactionStatusEnum,
  FinancesSortFieldEnum,
  FinancesSortOrderEnum,
  DatePresetEnum,
  TimeRangeEnum,
} from "./finances.constants";

export class TransactionHistoryQueryDto {
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

  @ApiPropertyOptional({ description: "Search by contact name" })
  @IsOptional()
  @TrimString()
  search?: string;

  @ApiPropertyOptional({
    description: "Filter by payment status",
    enum: TransactionStatusEnum,
  })
  @IsOptional()
  @IsEnum(TransactionStatusEnum)
  status?: TransactionStatusEnum = TransactionStatusEnum.ALL;

  @ApiPropertyOptional({
    description: "Sort field",
    enum: FinancesSortFieldEnum,
  })
  @IsOptional()
  @IsEnum(FinancesSortFieldEnum)
  sortBy?: FinancesSortFieldEnum = FinancesSortFieldEnum.DATE;

  @ApiPropertyOptional({
    description: "Sort direction",
    enum: FinancesSortOrderEnum,
  })
  @IsOptional()
  @IsEnum(FinancesSortOrderEnum)
  sortOrder?: FinancesSortOrderEnum = FinancesSortOrderEnum.DESC;

  @ApiPropertyOptional({
    description: "Date filter preset",
    enum: DatePresetEnum,
  })
  @IsOptional()
  @IsEnum(DatePresetEnum)
  datePreset?: DatePresetEnum = DatePresetEnum.ALL;

  @ApiPropertyOptional({ description: "Custom start date (ISO format)" })
  @IsOptional()
  @TrimString()
  startDate?: string;

  @ApiPropertyOptional({ description: "Custom end date (ISO format)" })
  @IsOptional()
  @TrimString()
  endDate?: string;
}

export class PayoutHistoryQueryDto {
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

  @ApiPropertyOptional({ description: "Filter by status" })
  @IsOptional()
  @TrimString()
  status?: string;

  @ApiPropertyOptional({ description: "Search by contact or requester name" })
  @IsOptional()
  @TrimString()
  search?: string;

  @ApiPropertyOptional({
    description: "Date filter preset",
    enum: DatePresetEnum,
  })
  @IsOptional()
  @IsEnum(DatePresetEnum)
  datePreset?: DatePresetEnum = DatePresetEnum.ALL;

  @ApiPropertyOptional({ description: "Custom start date (ISO format)" })
  @IsOptional()
  @TrimString()
  startDate?: string;

  @ApiPropertyOptional({ description: "Custom end date (ISO format)" })
  @IsOptional()
  @TrimString()
  endDate?: string;
}

export class OverviewQueryDto {
  @ApiPropertyOptional({
    description: "Time range",
    enum: TimeRangeEnum,
    default: TimeRangeEnum.DAYS_30,
    type: String,
  })
  @IsOptional()
  @IsEnum(TimeRangeEnum)
  timeRange?: TimeRangeEnum = TimeRangeEnum.DAYS_30;
}

export class PayoutTimelineQueryDto {
  @ApiPropertyOptional({
    description: "Number of items to return",
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 5;
}

export class RecentActivityQueryDto {
  @ApiPropertyOptional({
    description: "Number of items to return",
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 5;
}
