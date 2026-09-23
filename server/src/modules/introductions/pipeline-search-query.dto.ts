import { ApiPropertyOptional } from "@nestjs/swagger";
import { TrimString } from "decorators/trim-string.decorator";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class PipelineSearchQueryDto {
  @ApiPropertyOptional({
    description: "Case-insensitive search on title, names",
  })
  @IsOptional()
  @IsString()
  @TrimString()
  @MaxLength(200)
  search?: string;
}

export class RequesterPipelineStatsQueryDto extends PipelineSearchQueryDto {
  @ApiPropertyOptional({ enum: ["active", "completed"] })
  @IsOptional()
  @IsString()
  @IsIn(["active", "completed"])
  statsContext?: "active" | "completed";
}

export class ConnectorPipelineStatsQueryDto extends PipelineSearchQueryDto {
  @ApiPropertyOptional({
    enum: ["inbox", "pipeline", "archive", "unfulfilled"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["inbox", "pipeline", "archive", "unfulfilled"])
  statsContext?: "inbox" | "pipeline" | "archive" | "unfulfilled";
}
