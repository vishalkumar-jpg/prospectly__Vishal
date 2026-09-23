import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsInt, IsEnum, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { TrimString } from "decorators/trim-string.decorator";
import { DatePresetEnum } from "modules/finances/finances.constants";
import {
  ConnectorEarningStatusEnum,
  ConnectorEarningSortFieldEnum,
  ConnectorEarningSortOrderEnum,
} from "./connector-earning.constants";

export class ConnectorEarningQueryDto {
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
    description: "Search by job title or company name",
  })
  @IsOptional()
  @TrimString()
  search?: string;

  @ApiPropertyOptional({
    description: "Filter by processing status",
    enum: ConnectorEarningStatusEnum,
  })
  @IsOptional()
  @IsEnum(ConnectorEarningStatusEnum)
  status?: ConnectorEarningStatusEnum = ConnectorEarningStatusEnum.ALL;

  @ApiPropertyOptional({
    description: "Sort field",
    enum: ConnectorEarningSortFieldEnum,
  })
  @IsOptional()
  @IsEnum(ConnectorEarningSortFieldEnum)
  sortBy?: ConnectorEarningSortFieldEnum = ConnectorEarningSortFieldEnum.DATE;

  @ApiPropertyOptional({
    description: "Sort direction",
    enum: ConnectorEarningSortOrderEnum,
  })
  @IsOptional()
  @IsEnum(ConnectorEarningSortOrderEnum)
  sortOrder?: ConnectorEarningSortOrderEnum =
    ConnectorEarningSortOrderEnum.DESC;

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
