import { Body, Controller, Logger, Post, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { PublicIgnoreJwt } from "decorators/public-ignore-jwt.decorator";
import { SkipCSRF } from "decorators/skip-csrf.decorator";
import { XApiKeyGuard } from "guards/x-api-key.guard";
import responseUtils from "utils/response.utils";
import { ResumeIndexingQueueService } from "modules/recruitment/resume-indexing/resume-indexing-queue.service";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { BackfillCreditImportAllocationQueueService } from "./services/backfill-credit-import-allocation-queue.service";
import { BackfillScoreBreakdownQueueService } from "./score-breakdown/services/backfill-score-breakdown-queue.service";
import { BackfillScoreBreakdownDto } from "./score-breakdown/backfill-score-breakdown.dto";
import { BackfillResumeIndexDto } from "./resume-index/backfill-resume-index.dto";
import { BackfillEducationLevelDto } from "./education-level/backfill-education-level.dto";
import { BackfillEducationLevelQueueService } from "./education-level/services/backfill-education-level-queue.service";

@ApiTags(ApiTagsEnum.Backfill)
@Controller("backfill")
export class BackfillController {
  private readonly logger = new Logger(BackfillController.name);

  constructor(
    private readonly backfillCreditImportAllocationQueueService: BackfillCreditImportAllocationQueueService,
    private readonly backfillScoreBreakdownQueueService: BackfillScoreBreakdownQueueService,
    private readonly resumeIndexingQueueService: ResumeIndexingQueueService,
    private readonly backfillEducationLevelQueueService: BackfillEducationLevelQueueService
  ) {}

  /**
   * Phase 2 entry point. Phase 1 indexes new resumes only, so this is not
   * expected to be invoked until the existing corpus is backfilled.
   */
  @PublicIgnoreJwt()
  @SkipCSRF()
  @UseGuards(XApiKeyGuard)
  @Post("recruitment/resume-index")
  async backfillResumeIndex(
    @Body() dto: BackfillResumeIndexDto,
    @Res() res: Response
  ) {
    try {
      await this.resumeIndexingQueueService.queueBackfillScan({
        cursor: null,
        force: dto.force ?? false,
        pageSize: dto.pageSize,
        jobId: dto.jobId ?? null,
      });
      return responseUtils.success(res, {
        data: {
          message: dto.jobId
            ? `Resume search index backfill queued for job ${dto.jobId}. Check server logs for progress.`
            : "Resume search index backfill queued for all resumes. Check server logs for progress.",
        },
      });
    } catch (error) {
      this.logger.error(
        `BACKFILL_CONTROLLER :: RECRUITMENT_RESUME_INDEX : ERROR : ${error}`,
        error instanceof Error ? error.stack : undefined
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @PublicIgnoreJwt()
  @SkipCSRF()
  @UseGuards(XApiKeyGuard)
  @Post("credits/import-allocations")
  async backfillImportCreditAwards(@Res() res: Response) {
    try {
      await this.backfillCreditImportAllocationQueueService.enqueueBackfill();
      return responseUtils.success(res, {
        data: {
          message: `Credit import allocation backfill queued. Check server logs for progress and summary.`,
        },
      });
    } catch (error) {
      this.logger.error(
        `BACKFILL_CONTROLLER :: CREDITS_IMPORT_ALLOCATIONS : ERROR : ${error}`,
        error instanceof Error ? error.stack : undefined
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @PublicIgnoreJwt()
  @SkipCSRF()
  @UseGuards(XApiKeyGuard)
  @Post("recruitment/score-breakdown")
  async backfillRecruitmentScoreBreakdown(
    @Body() dto: BackfillScoreBreakdownDto,
    @Res() res: Response
  ) {
    try {
      await this.backfillScoreBreakdownQueueService.enqueueBackfill(
        dto.jobIds,
        dto.force ?? false
      );
      return responseUtils.success(res, {
        data: {
          message: `Recruitment score breakdown backfill queued for ${String(dto.jobIds.length)} job(s). Check server logs for progress and summary.`,
        },
      });
    } catch (error) {
      this.logger.error(
        `BACKFILL_CONTROLLER :: RECRUITMENT_SCORE_BREAKDOWN : ERROR : ${error}`,
        error instanceof Error ? error.stack : undefined
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  /**
   * Fills `contact_resumes.education_level` for résumés parsed before the
   * column existed.
   *
   * Derived from `metadata.education[]`, which is already stored, so this costs
   * a query rather than an AI call per résumé — and it is idempotent, touching
   * only rows still unset unless `force` says otherwise.
   */
  @PublicIgnoreJwt()
  @SkipCSRF()
  @UseGuards(XApiKeyGuard)
  @Post("recruitment/education-level")
  async backfillEducationLevel(
    @Body() dto: BackfillEducationLevelDto,
    @Res() res: Response
  ) {
    try {
      const jobId =
        await this.backfillEducationLevelQueueService.enqueueBackfill(
          dto.force ?? false
        );
      return responseUtils.success(res, {
        data: {
          jobId,
          message:
            "Education level backfill queued. Check server logs for progress.",
        },
      });
    } catch (error) {
      this.logger.error(
        `BACKFILL_CONTROLLER :: RECRUITMENT_EDUCATION_LEVEL : ERROR : ${error}`,
        error instanceof Error ? error.stack : undefined
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }
}
