import {
  IsOptional,
  IsNumberString,
  IsIn,
  IsArray,
  MaxLength,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { TrimString } from "decorators/trim-string.decorator";

export class BrowseMarketplaceQueryDto {
  @ApiPropertyOptional({ default: "1" })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ default: "20" })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({
    enum: ["bounty-high", "bounty-low", "ending", "interest"],
    default: "bounty-high",
  })
  @IsOptional()
  @IsIn(["bounty-high", "bounty-low", "ending", "interest"])
  sortBy?: string;

  @ApiPropertyOptional({ description: "Filter by urgency levels" })
  @IsOptional()
  @IsArray()
  urgency?: string[];

  @ApiPropertyOptional({ description: "Minimum bounty amount" })
  @IsOptional()
  @IsNumberString()
  bountyMin?: string;

  @ApiPropertyOptional({ description: "Maximum bounty amount" })
  @IsOptional()
  @IsNumberString()
  bountyMax?: string;

  @ApiPropertyOptional({ description: "Search term for prospect/company" })
  @IsOptional()
  @MaxLength(100)
  @TrimString()
  searchTerm?: string;
}

export class BrowseFiltersResponseDto {
  urgencyOptions: string[];
  bountyRange: { min: number; max: number };
  sortOptions: { value: string; label: string }[];
}
