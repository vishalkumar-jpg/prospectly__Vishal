import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Logger,
  Res,
} from "@nestjs/common";
import { RequireModule } from "decorators/require-module.decorator";
import { RequirePermission } from "decorators/require-recruitment-permission.decorator";
import { Response } from "express";
import { CurrentUser } from "decorators/current-user.decorator";
import { RECRUITMENT_PERMISSIONS } from "modules/recruitment/collaboration/recruitment-collaboration.constants";
import responseUtils from "utils/response.utils";
import {
  CandidatesMutationService,
  CandidatesCheckApplicationService,
  CandidatesListService,
  CandidatesDetailService,
  CandidatesResumeService,
} from "./services";
import {
  ApplyToJobDto,
  CheckApplicationQueryDto,
  GetJobCandidatesQueryDto,
} from "./candidates.dto";

// NOTE: This controller is intentionally NOT gated at the class level.
// `apply` (POST /apply) and `checkApplication` (GET /check) are a candidate's
// own self-apply actions and must be reachable by any authenticated user, like
// My Applications — both are scoped to the current user (candidateUserId = userId
// from JWT). The recruiter-only routes (`getJobCandidates`, `getCandidateDetail`)
// keep their `@RequireModule("recruiting")` at method level.
@Controller("recruitment/candidates")
export class CandidatesController {
  private readonly logger = new Logger(CandidatesController.name);

  constructor(
    private readonly mutationService: CandidatesMutationService,
    private readonly checkApplicationService: CandidatesCheckApplicationService,
    private readonly listService: CandidatesListService,
    private readonly detailService: CandidatesDetailService,
    private readonly resumeService: CandidatesResumeService
  ) {}

  @Post("apply")
  async apply(
    @CurrentUser("userId") userId: string,
    @Body() dto: ApplyToJobDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.mutationService.apply(userId, dto);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(`CANDIDATES_CONTROLLER :: APPLY : ERROR : ${error}`);
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Get("check")
  async checkApplication(
    @CurrentUser("userId") userId: string,
    @Query() query: CheckApplicationQueryDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.checkApplicationService.checkApplication(
        userId,
        query.jobId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATES_CONTROLLER :: CHECK_APPLICATION : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @RequireModule("recruiting")
  @RequirePermission(RECRUITMENT_PERMISSIONS.CANDIDATE_VIEW, {
    from: "job",
    param: "jobId",
  })
  @Get("job/:jobId")
  async getJobCandidates(
    @CurrentUser("userId") userId: string,
    @Param("jobId") jobId: string,
    @Query() query: GetJobCandidatesQueryDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.listService.getCandidatesByJobId(
        userId,
        jobId,
        query
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATES_CONTROLLER :: GET_JOB_CANDIDATES : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @RequireModule("recruiting")
  @RequirePermission(RECRUITMENT_PERMISSIONS.CANDIDATE_VIEW, {
    from: "candidate",
  })
  @Get(":candidateId")
  async getCandidateDetail(
    @CurrentUser("userId") userId: string,
    @Param("candidateId") candidateId: string,
    @Res() res: Response
  ) {
    try {
      const data = await this.detailService.getCandidateDetail(
        userId,
        candidateId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATES_CONTROLLER :: GET_CANDIDATE_DETAIL : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  // Mints a short-lived presigned GET URL for the candidate's original resume.
  // Same guards as getCandidateDetail; the resume is served from a private bucket
  // so the URL is never embedded in the (cached) detail payload.
  @RequireModule("recruiting")
  @RequirePermission(RECRUITMENT_PERMISSIONS.CANDIDATE_VIEW, {
    from: "candidate",
  })
  @Get(":candidateId/resume")
  async getCandidateResume(
    @CurrentUser("userId") userId: string,
    @Param("candidateId") candidateId: string,
    @Res() res: Response
  ) {
    try {
      const data = await this.resumeService.getCandidateResumeUrl(
        userId,
        candidateId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATES_CONTROLLER :: GET_CANDIDATE_RESUME : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }
}
