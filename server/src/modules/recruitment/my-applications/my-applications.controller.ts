import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Logger,
  Res,
  ParseUUIDPipe,
} from "@nestjs/common";
import { Response } from "express";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { MyApplicationsService } from "./my-applications.service";
import { GetMyApplicationsQueryDto } from "./my-applications.dto";
import { CandidateEvaluationRetryService } from "../candidate-evaluation/services/candidate-evaluation-retry.service";

// NOTE: Intentionally NOT gated by @RequireModule("recruiting").
// "My Applications" is the job-seeker's own view and must be accessible to any
// authenticated user, like Prospecting. JwtAuthGuard still enforces auth, and
// MyApplicationsService filters to the current user's own applications only.
@Controller("recruitment/my-applications")
export class MyApplicationsController {
  private readonly logger = new Logger(MyApplicationsController.name);

  constructor(
    private readonly myApplicationsService: MyApplicationsService,
    private readonly evaluationRetryService: CandidateEvaluationRetryService
  ) {}

  @Get()
  async getMyApplications(
    @CurrentUser("userId") userId: string,
    @Query() query: GetMyApplicationsQueryDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.myApplicationsService.getMyApplications(
        userId,
        query
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `MY_APPLICATIONS_CONTROLLER :: GET_MY_APPLICATIONS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Post(":candidateId/retry-evaluation")
  async retryEvaluation(
    @Param("candidateId", new ParseUUIDPipe()) candidateId: string,
    @CurrentUser("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      await this.evaluationRetryService.retryEvaluation(candidateId, userId);
      return responseUtils.success(res, {
        data: { candidateId, message: "Retry queued" },
      });
    } catch (error) {
      this.logger.error(
        `MY_APPLICATIONS_CONTROLLER :: RETRY_EVALUATION : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }
}
