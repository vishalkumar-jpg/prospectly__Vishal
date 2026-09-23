import { Body, Controller, Logger, Param, Post, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { CurrentUser } from "decorators/current-user.decorator";
import { RequireModule } from "decorators/require-module.decorator";
import { RequirePermission } from "decorators/require-recruitment-permission.decorator";
import { RECRUITMENT_PERMISSIONS } from "modules/recruitment/collaboration/recruitment-collaboration.constants";
import responseUtils from "utils/response.utils";
import { describeDbError } from "utils/db-error.utils";
import { ResumeSearchDto } from "./resume-search.dto";
import { ResumeSearchService } from "./services";

@Controller("recruitment/candidates")
export class ResumeSearchController {
  private readonly logger = new Logger(ResumeSearchController.name);

  constructor(private readonly resumeSearchService: ResumeSearchService) {}

  /**
   * Returns a ranked candidateId projection, hard-capped at
   * RESUME_SEARCH_MAX_RESULTS — not a listing, so it is intentionally not
   * paginated. The client already holds the board rows and only needs the
   * ranking to filter and annotate them.
   */
  @RequireModule("recruiting")
  @RequirePermission(RECRUITMENT_PERMISSIONS.CANDIDATE_VIEW, {
    from: "job",
    param: "jobId",
  })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post("job/:jobId/resume-search")
  async searchResumes(
    @CurrentUser("userId") userId: string,
    @Param("jobId") jobId: string,
    @Body() dto: ResumeSearchDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.resumeSearchService.search(
        { kind: "job", jobId },
        dto.query,
        userId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      // describeDbError, not `${error}`: a failure from the hybrid query
      // arrives as a DrizzleQueryError whose message is the whole statement
      // plus every bound parameter — including the 768-float embedding. The
      // stack comes from the second argument because describeDbError returns
      // a message only.
      this.logger.error(
        `RESUME_SEARCH_CONTROLLER :: SEARCH_RESUMES : ERROR : ${describeDbError(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }
}
