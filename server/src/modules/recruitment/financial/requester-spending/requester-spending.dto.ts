import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsInt, IsEnum, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { TrimString } from "decorators/trim-string.decorator";
import { DatePresetEnum } from "modules/finances/finances.constants";
import {
  RequesterSpendingStatusEnum,
  RequesterSpendingSortFieldEnum,
  RequesterSpendingSortOrderEnum,
} from "./requester-spending.constants";

export class RequesterSpendingQueryDto {
  @ApiPropertyOptional({ description: "Page number (1-indexed)", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Items per page", default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: "Search by job title, candidate name, or amount",
  })
  @IsOptional()
  @TrimString()
  search?: string;

  @ApiPropertyOptional({
    description: "Filter by transaction status",
    enum: RequesterSpendingStatusEnum,
  })
  @IsOptional()
  @IsEnum(RequesterSpendingStatusEnum)
  status?: RequesterSpendingStatusEnum = RequesterSpendingStatusEnum.ALL;

  @ApiPropertyOptional({
    description: "Sort field",
    enum: RequesterSpendingSortFieldEnum,
  })
  @IsOptional()
  @IsEnum(RequesterSpendingSortFieldEnum)
  sortBy?: RequesterSpendingSortFieldEnum = RequesterSpendingSortFieldEnum.DATE;

  @ApiPropertyOptional({
    description: "Sort direction",
    enum: RequesterSpendingSortOrderEnum,
  })
  @IsOptional()
  @IsEnum(RequesterSpendingSortOrderEnum)
  sortOrder?: RequesterSpendingSortOrderEnum =
    RequesterSpendingSortOrderEnum.DESC;

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
