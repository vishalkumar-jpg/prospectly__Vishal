import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { RequireModule } from "decorators/require-module.decorator";
import { RequirePermission } from "decorators/require-recruitment-permission.decorator";
import { RecruitmentAccess } from "decorators/recruitment-access.decorator";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { RECRUITMENT_PERMISSIONS } from "./recruitment-collaboration.constants";
import { ResolvedJobAccess } from "./services/recruitment-access.service";
import {
  CollaboratorAddService,
  CollaboratorListService,
  CollaboratorRemoveService,
  CollaboratorRolesService,
} from "./services";
import {
  BulkAddCollaboratorsDto,
  JobIdParamDto,
  ListEligibleMembersQueryDto,
  RemoveCollaboratorParamDto,
} from "./recruitment-collaboration.dto";

@ApiTags("Recruitment Collaboration")
@ApiBearerAuth()
@RequireModule("recruiting")
// All collaborator-management routes are owner-only — gated once at the class level.
@RequirePermission(RECRUITMENT_PERMISSIONS.COLLABORATOR_MANAGE, {
  from: "job",
  param: "jobId",
})
@Controller("recruitment/jobs/:jobId/collaborators")
export class RecruitmentCollaborationController {
  private readonly logger = new Logger(RecruitmentCollaborationController.name);

  constructor(
    private readonly listService: CollaboratorListService,
    private readonly rolesService: CollaboratorRolesService,
    private readonly addService: CollaboratorAddService,
    private readonly removeService: CollaboratorRemoveService
  ) {}

  @Get("roles")
  async listRoles(
    @CurrentUser("userId") userId: string,
    @Param() params: JobIdParamDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.rolesService.listCollaborationRoles(
        userId,
        params.jobId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_COLLABORATION_CONTROLLER :: LIST_ROLES : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Get()
  async list(
    @CurrentUser("userId") userId: string,
    @Param() params: JobIdParamDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.listService.getCollaborators(
        userId,
        params.jobId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_COLLABORATION_CONTROLLER :: LIST : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Get("eligible")
  async listEligible(
    @RecruitmentAccess() access: ResolvedJobAccess,
    @Query() query: ListEligibleMembersQueryDto,
    @Res() res: Response
  ) {
    try {
      // Eligible members are scoped to the JOB OWNER's organisations, not the
      // acting user's (who may be a managing collaborator in a different org).
      const data = await this.listService.getEligibleMembers(
        access.job.requesterId,
        access.job.id,
        query
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_COLLABORATION_CONTROLLER :: LIST_ELIGIBLE : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Post("bulk")
  async addBulk(
    @CurrentUser("userId") userId: string,
    @RecruitmentAccess() access: ResolvedJobAccess,
    @Body() dto: BulkAddCollaboratorsDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.addService.addCollaboratorsBulk(
        userId,
        access,
        dto
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_COLLABORATION_CONTROLLER :: ADD_BULK : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @Delete(":collaboratorUserId")
  async remove(
    @CurrentUser("userId") userId: string,
    @Param() params: RemoveCollaboratorParamDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.removeService.removeCollaborator(
        userId,
        params.jobId,
        params.collaboratorUserId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_COLLABORATION_CONTROLLER :: REMOVE : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }
}
