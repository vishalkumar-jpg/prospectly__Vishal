import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SCORE_BREAKDOWN_MAX_JOB_IDS } from "./backfill-score-breakdown.constants";

export class BackfillScoreBreakdownDto {
  @ApiProperty({
    description: "Recruitment job ids whose candidates should be annotated",
    type: [String],
    maxItems: SCORE_BREAKDOWN_MAX_JOB_IDS,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(SCORE_BREAKDOWN_MAX_JOB_IDS)
  @IsUUID(undefined, { each: true })
  jobIds: string[];

  @ApiPropertyOptional({
    description:
      "Regenerate rows that already have a breakdown (costs a Gemini call each)",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
