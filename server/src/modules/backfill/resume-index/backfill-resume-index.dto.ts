import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";
import { RESUME_INDEXING_BACKFILL_MAX_PAGE_SIZE } from "modules/recruitment/resume-indexing/resume-indexing.constants";

export class BackfillResumeIndexDto {
  /**
   * Restrict the sweep to the resumes reachable from one job — its candidates
   * and its connectors' pool matches. Omit to sweep the whole corpus, which is
   * the original behaviour.
   */
  @IsOptional()
  @IsUUID()
  jobId?: string;

  /** Re-index every resume, not just the ones missing an index row. */
  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(RESUME_INDEXING_BACKFILL_MAX_PAGE_SIZE)
  pageSize?: number;
}
