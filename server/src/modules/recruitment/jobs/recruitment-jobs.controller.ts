import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  Param,
  Logger,
  Res,
} from "@nestjs/common";
import { RequireModule } from "decorators/require-module.decorator";
import { RequirePermission } from "decorators/require-recruitment-permission.decorator";
import { RecruitmentAccess } from "decorators/recruitment-access.decorator";
import { Response } from "express";
import { CurrentUser } from "decorators/current-user.decorator";
import { RECRUITMENT_PERMISSIONS } from "modules/recruitment/collaboration/recruitment-collaboration.constants";
import { ResolvedJobAccess } from "modules/recruitment/collaboration/services/recruitment-access.service";
import responseUtils from "utils/response.utils";
import {
  RecruitmentJobsQueryService,
  RecruitmentJobsCreateService,
  RecruitmentJobsUpdateService,
  RecruitmentJobsCloseService,
  RecruitmentJobsReopenService,
} from "./services";
import {
  CloseRecruitmentJobDto,
  ReopenRecruitmentJobDto,
  CreateRecruitmentJobDto,
  GetJobQueryDto,
  GetRecruitmentJobsQueryDto,
  UpdateRecruitmentJobDto,
} from "./recruitment-jobs.dto";

@RequireModule("recruiting")
@Controller("recruitment/jobs")
export class RecruitmentJobsController {
  private readonly logger = new Logger(RecruitmentJobsController.name);

  constructor(
    private readonly queryService: RecruitmentJobsQueryService,
    private readonly createService: RecruitmentJobsCreateService,
    private readonly updateService: RecruitmentJobsUpdateService,
    private readonly closeService: RecruitmentJobsCloseService,
    private readonly reopenService: RecruitmentJobsReopenService
  ) {}

  @Get("stats")
  async getJobStats(
    @CurrentUser("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      const data = await this.queryService.getJobStats(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_JOBS_CONTROLLER :: GET_JOB_STATS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Get()
  async getJobs(
    @CurrentUser("userId") userId: string,
    @Query() query: GetRecruitmentJobsQueryDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.queryService.getJobsByUser(userId, query);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_JOBS_CONTROLLER :: GET_JOBS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @RequirePermission(null, { from: "job", param: "id" })
  @Get(":id")
  async getJob(
    @RecruitmentAccess() access: ResolvedJobAccess,
    @Query() query: GetJobQueryDto,
    @Res() res: Response
  ) {
    try {
      const data =
        query.view === "pipeline"
          ? await this.queryService.getJobById(access, { view: "pipeline" })
          : await this.queryService.getJobById(access);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_JOBS_CONTROLLER :: GET_JOB : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @RequirePermission(RECRUITMENT_PERMISSIONS.JOB_CLOSE, {
    from: "job",
    param: "id",
  })
  @Patch(":id/close")
  async closeJob(
    @CurrentUser("userId") userId: string,
    @RecruitmentAccess() access: ResolvedJobAccess,
    @Body() dto: CloseRecruitmentJobDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.closeService.closeJob(userId, access, dto);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_JOBS_CONTROLLER :: CLOSE_JOB : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @RequirePermission(RECRUITMENT_PERMISSIONS.JOB_CLOSE, {
    from: "job",
    param: "id",
  })
  @Patch(":id/reopen")
  async reopenJob(
    @CurrentUser("userId") userId: string,
    @RecruitmentAccess() access: ResolvedJobAccess,
    @Body() dto: ReopenRecruitmentJobDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.reopenService.reopenJob(userId, access, dto);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_JOBS_CONTROLLER :: REOPEN_JOB : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @RequirePermission(RECRUITMENT_PERMISSIONS.JOB_EDIT, {
    from: "job",
    param: "id",
  })
  @Patch(":id")
  async updateJob(
    @CurrentUser("userId") userId: string,
    @Param("id") id: string,
    @Body() dto: UpdateRecruitmentJobDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.updateService.updateJob(userId, id, dto);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_JOBS_CONTROLLER :: UPDATE_JOB : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Post()
  async createJob(
    @CurrentUser("userId") userId: string,
    @Body() dto: CreateRecruitmentJobDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.createService.createJob(userId, dto);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_JOBS_CONTROLLER :: CREATE_JOB : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }
}
