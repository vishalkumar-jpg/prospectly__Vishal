import { IsBoolean, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class BackfillEducationLevelDto {
  @ApiPropertyOptional({
    description:
      "Recompute rows that already have a level. What a change to the normaliser's degree patterns calls for; otherwise only unset rows are touched.",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
