import { IsOptional, IsIn, ValidateNested } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { PipelineFilterStages } from "./pipeline-filter-stages.validator";
import {
  REQUESTER_PIPELINE_FILTER_STAGES,
  CONNECTOR_PIPELINE_FILTER_STAGES,
  RECRUITER_PIPELINE_FILTER_STAGES,
  MY_PIPELINE_FILTER_STAGES,
} from "./pipeline-filter-stages.constants";

/** Partial patch for `user_configurations.user_filter` jsonb keys. */
export class UserFilterDto {
  @ApiPropertyOptional({
    type: [String],
    example: ["intro_sent", "meeting_booked"],
  })
  @PipelineFilterStages(REQUESTER_PIPELINE_FILTER_STAGES)
  requester?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ["intro_sent", "meeting_booked"],
  })
  @PipelineFilterStages(CONNECTOR_PIPELINE_FILTER_STAGES)
  connector?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ["in_review", "shortlisted"],
  })
  @PipelineFilterStages(RECRUITER_PIPELINE_FILTER_STAGES)
  recruiter?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ["qualified", "consent_pending", "shortlisted"],
  })
  @PipelineFilterStages(MY_PIPELINE_FILTER_STAGES)
  my_pipeline?: string[];
}

export class UpdateUserConfigurationDto {
  @ApiPropertyOptional({
    enum: ["automatic", "manual"],
    example: "automatic",
  })
  @IsOptional()
  @IsIn(["automatic", "manual"])
  googleImportTab?: "automatic" | "manual";

  @ApiPropertyOptional({
    enum: ["automatic", "manual"],
    example: "automatic",
  })
  @IsOptional()
  @IsIn(["automatic", "manual"])
  microsoftImportTab?: "automatic" | "manual";

  @ApiPropertyOptional({
    enum: ["intro", "automatic", "manual", "automatic-credentials"],
    example: "intro",
  })
  @IsOptional()
  @IsIn(["intro", "automatic", "manual", "automatic-credentials"])
  appleImportTab?: "intro" | "automatic" | "manual" | "automatic-credentials";

  @ApiPropertyOptional({
    enum: ["instructions", "upload_zip"],
    example: "instructions",
  })
  @IsOptional()
  @IsIn(["instructions", "upload_zip"])
  linkedinImportTab?: "instructions" | "upload_zip";

  @ApiPropertyOptional({ type: UserFilterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserFilterDto)
  userFilter?: UserFilterDto;

  @ApiPropertyOptional({
    enum: ["recruiting", "prospecting", "both"],
    example: "recruiting",
  })
  @IsOptional()
  @IsIn(["recruiting", "prospecting", "both"])
  preferredWorkspace?: "recruiting" | "prospecting" | "both";

  @ApiPropertyOptional({
    enum: ["recruiting", "prospecting"],
    example: "recruiting",
  })
  @IsOptional()
  @IsIn(["recruiting", "prospecting"])
  primaryWorkspace?: "recruiting" | "prospecting";
}
