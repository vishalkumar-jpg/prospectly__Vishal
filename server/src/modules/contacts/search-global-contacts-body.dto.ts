import { IsOptional, IsString, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { TrimString } from "decorators/trim-string.decorator";

/** POST body for global contact search — use this so `email` is not placed in the query string. */
export class SearchGlobalContactsBodyDto {
  @ApiPropertyOptional({
    description: "Legacy search query (searches across all fields)",
  })
  @IsOptional()
  @IsString()
  @TrimString()
  q?: string;

  @ApiPropertyOptional({
    description:
      "LinkedIn profile URL or username (e.g., linkedin.com/in/johndoe or just johndoe)",
  })
  @IsOptional()
  @IsString()
  @TrimString()
  linkedinUrl?: string;

  @ApiPropertyOptional({ description: "Person's full name" })
  @IsOptional()
  @IsString()
  @TrimString()
  name?: string;

  @ApiPropertyOptional({ description: "Person's email address" })
  @IsOptional()
  @IsString()
  @TrimString()
  email?: string;

  @ApiPropertyOptional({ description: "Company name" })
  @IsOptional()
  @IsString()
  @TrimString()
  company?: string;

  @ApiPropertyOptional({ description: "Company website/domain" })
  @IsOptional()
  @IsString()
  @TrimString()
  website?: string;

  @ApiPropertyOptional({ description: "Max results (1–100, default 50)" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
