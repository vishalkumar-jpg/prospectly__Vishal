import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  Matches,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { TrimString } from "decorators/trim-string.decorator";
import { ReasonEnum, SortFieldEnum, SortOrderEnum } from "./privacy.constants";

export class CreateDto {
  @ApiProperty({
    description: "Domain name",
    example: "example.com",
  })
  @TrimString()
  @IsString()
  @IsNotEmpty({ message: "Domain is required" })
  @Matches(/^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/, {
    message: "Please enter a valid domain name",
  })
  domain: string;

  @ApiProperty({
    description: "Reason for blocking",
    enum: ReasonEnum,
    example: ReasonEnum.DIRECT_COMPETITOR,
  })
  @IsEnum(ReasonEnum, {
    message: "Invalid reason provided",
  })
  @IsNotEmpty({ message: "Reason is required" })
  reason: ReasonEnum;

  @ApiPropertyOptional({
    description: "Hide profile from their users",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hideProfile?: boolean = false;

  @ApiPropertyOptional({
    description: "Hide bounties from their users",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hideBounties?: boolean = false;

  @ApiPropertyOptional({
    description: "Exclude from search results",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  excludeFromSearch?: boolean = false;
}

export class UpdateDto {
  @ApiPropertyOptional({
    description: "Domain name",
    example: "example.com",
  })
  @TrimString()
  @IsString()
  @IsOptional()
  @Matches(/^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/, {
    message: "Please enter a valid domain name",
  })
  domain?: string;

  @ApiPropertyOptional({
    description: "Reason for blocking",
    enum: ReasonEnum,
  })
  @IsEnum(ReasonEnum, {
    message: "Invalid reason provided",
  })
  @IsOptional()
  reason?: ReasonEnum;

  @ApiPropertyOptional({
    description: "Hide profile from their users",
  })
  @IsOptional()
  @IsBoolean()
  hideProfile?: boolean;

  @ApiPropertyOptional({
    description: "Hide bounties from their users",
  })
  @IsOptional()
  @IsBoolean()
  hideBounties?: boolean;

  @ApiPropertyOptional({
    description: "Exclude from search results",
  })
  @IsOptional()
  @IsBoolean()
  excludeFromSearch?: boolean;
}

export class QueryDto {
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

  @ApiPropertyOptional({ description: "Search by domain name or reason" })
  @IsOptional()
  @TrimString()
  search?: string;

  @ApiPropertyOptional({
    description: "Sort field",
    enum: SortFieldEnum,
    default: SortFieldEnum.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(SortFieldEnum)
  sort?: SortFieldEnum = SortFieldEnum.CREATED_AT;

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
  @Type(() => Boolean)
  isPagination?: boolean = true;
}

export class BulkDeleteDto {
  @ApiProperty({
    description: "Array of privacy setting IDs to delete",
    type: [String],
  })
  @IsNotEmpty({ message: "IDs array is required" })
  ids: string[];
}
