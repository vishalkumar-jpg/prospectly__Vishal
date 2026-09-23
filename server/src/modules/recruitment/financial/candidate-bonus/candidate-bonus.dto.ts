import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsInt,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { TrimString } from "decorators/trim-string.decorator";
import { DatePresetEnum } from "modules/finances/finances.constants";
import {
  CandidateBonusStatusEnum,
  CandidateBonusSortFieldEnum,
  CandidateBonusSortOrderEnum,
} from "./candidate-bonus.constants";

export class CandidateBonusQueryDto {
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
    enum: CandidateBonusStatusEnum,
  })
  @IsOptional()
  @IsEnum(CandidateBonusStatusEnum)
  status?: CandidateBonusStatusEnum = CandidateBonusStatusEnum.ALL;

  @ApiPropertyOptional({
    description: "Sort field",
    enum: CandidateBonusSortFieldEnum,
  })
  @IsOptional()
  @IsEnum(CandidateBonusSortFieldEnum)
  sortBy?: CandidateBonusSortFieldEnum = CandidateBonusSortFieldEnum.DATE;

  @ApiPropertyOptional({
    description: "Sort direction",
    enum: CandidateBonusSortOrderEnum,
  })
  @IsOptional()
  @IsEnum(CandidateBonusSortOrderEnum)
  sortOrder?: CandidateBonusSortOrderEnum = CandidateBonusSortOrderEnum.DESC;

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
  @IsDateString(
    {},
    { message: "startDate must be a valid ISO 8601 date string" }
  )
  startDate?: string;

  @ApiPropertyOptional({ description: "Custom end date (ISO format)" })
  @IsOptional()
  @TrimString()
  @IsDateString({}, { message: "endDate must be a valid ISO 8601 date string" })
  endDate?: string;
}
