import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Res,
  Req,
  Logger,
  Body,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "decorators/current-user.decorator";
import { Public } from "decorators/public.decorator";
import { RequireModule } from "decorators/require-module.decorator";
import { SkipCSRF } from "decorators/skip-csrf.decorator";
import responseUtils from "utils/response.utils";
import { getClientIp } from "utils/ip-extraction.util";
import { appConfig } from "config/app.config";
import { Response, Request } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { RecruitmentJobShareService } from "./share.service";
import { CreateJobShareDto, GetMyJobSharesQueryDto } from "./share.dto";

@ApiTags(ApiTagsEnum.Recruitment)
@RequireModule("recruiting")
@Controller()
export class RecruitmentJobShareController {
  private readonly logger = new Logger(RecruitmentJobShareController.name);

  constructor(private readonly shareService: RecruitmentJobShareService) {}

  @Post("recruitment/marketplace/share")
  @ApiBearerAuth()
  async shareJob(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() dto: CreateJobShareDto
  ) {
    try {
      const share = await this.shareService.createShare(userId, dto);
      const data = {
        ...share,
        shareUrl: `${appConfig.frontendUrl}/jobs/${dto.jobId}?ref=${share.sharerCode}`,
      };
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_SHARE_CONTROLLER :: SHARE_JOB : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("recruitment/marketplace/my-job-shares")
  @ApiBearerAuth()
  async getMyJobShares(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Query() query: GetMyJobSharesQueryDto
  ) {
    try {
      const page = parseInt(query.page || "1", 10);
      const limit = Math.min(parseInt(query.limit || "20", 10), 50);
      const data = await this.shareService.getUserJobShares(
        userId,
        page,
        limit
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_SHARE_CONTROLLER :: GET_MY_JOB_SHARES : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("recruitment/jobs/public/:jobId")
  @Public()
  @SkipCSRF()
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getPublicJob(
    @Res() res: Response,
    @Req() req: Request,
    @Param("jobId") jobId: string,
    @Query("ref") ref?: string,
    @Query("includeClosed") includeClosed?: string
  ) {
    try {
      const includeClosedJobs =
        includeClosed === "true" || includeClosed === "1";
      const job = await this.shareService.getPublicJob(
        jobId,
        includeClosedJobs as boolean
      );

      if (!job) {
        throw new NotFoundException("Job not found or is no longer active");
      }

      // Track view if ref code is provided
      if (ref) {
        const share = await this.shareService.getShareByCode(ref);
        if (share) {
          const ip = getClientIp(req);
          const userAgent = req.headers["user-agent"];
          const referrer = req.headers["referer"] as string | undefined;
          await this.shareService
            .trackView(share.id, ip, userAgent, referrer)
            .catch((err) => {
              this.logger.error(
                `RECRUITMENT_SHARE_CONTROLLER :: TRACK_VIEW : ERROR : ${err}`
              );
            });
        }
      }

      return responseUtils.success(res, { data: job });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_SHARE_CONTROLLER :: GET_PUBLIC_JOB : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
