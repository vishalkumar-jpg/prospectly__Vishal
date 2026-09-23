import {
  Controller,
  Get,
  Patch,
  Body,
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
  CandidateWorkflowRejectService,
  CandidateWorkflowShortlistService,
  CandidateWorkflowInterviewInviteService,
  CandidateWorkflowHireService,
  CandidateWorkflowClassificationService,
  CandidateWorkflowReinstateService,
} from "./services";
import {
  RejectCandidateDto,
  RejectCandidateParamDto,
  SendInterviewInviteDto,
  HireCandidateDto,
  UpdateClassificationDto,
  ReinstateCandidateDto,
} from "./candidate-workflow.dto";

@RequireModule("recruiting")
@Controller("recruitment/candidate-workflow")
export class CandidateWorkflowController {
  private readonly logger = new Logger(CandidateWorkflowController.name);

  constructor(
    private readonly rejectService: CandidateWorkflowRejectService,
    private readonly shortlistService: CandidateWorkflowShortlistService,
    private readonly interviewInviteService: CandidateWorkflowInterviewInviteService,
    private readonly hireService: CandidateWorkflowHireService,
    private readonly classificationService: CandidateWorkflowClassificationService,
    private readonly reinstateService: CandidateWorkflowReinstateService
  ) {}

  @RequirePermission(RECRUITMENT_PERMISSIONS.CANDIDATE_REJECT, {
    from: "candidate",
  })
  @Patch(":candidateId/reject")
  async reject(
    @CurrentUser("userId") userId: string,
    @Param() params: RejectCandidateParamDto,
    @Body() dto: RejectCandidateDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.rejectService.rejectCandidate(
        userId,
        params.candidateId,
        dto
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_WORKFLOW_CONTROLLER :: REJECT : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @RequirePermission(RECRUITMENT_PERMISSIONS.CANDIDATE_SHORTLIST, {
    from: "candidate",
  })
  @Patch(":candidateId/shortlist")
  async shortlist(
    @CurrentUser("userId") userId: string,
    @Param() params: RejectCandidateParamDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.shortlistService.shortlistCandidate(
        userId,
        params.candidateId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_WORKFLOW_CONTROLLER :: SHORTLIST : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @RequirePermission(RECRUITMENT_PERMISSIONS.CANDIDATE_INTERVIEW_INVITE, {
    from: "candidate",
  })
  @Patch(":candidateId/send-interview-invite")
  async sendInterviewInvite(
    @CurrentUser("userId") userId: string,
    @Param() params: RejectCandidateParamDto,
    @Body() dto: SendInterviewInviteDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.interviewInviteService.sendInterviewInvite(
        userId,
        params.candidateId,
        dto
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_WORKFLOW_CONTROLLER :: SEND_INTERVIEW_INVITE : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @RequirePermission(RECRUITMENT_PERMISSIONS.CANDIDATE_HIRE, {
    from: "candidate",
  })
  @Patch(":candidateId/hire")
  async hire(
    @CurrentUser("userId") userId: string,
    @Param() params: RejectCandidateParamDto,
    @Body() dto: HireCandidateDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.hireService.hireCandidate(
        userId,
        params.candidateId,
        dto
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_WORKFLOW_CONTROLLER :: HIRE : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @RequirePermission(RECRUITMENT_PERMISSIONS.CANDIDATE_CLASSIFY, {
    from: "candidate",
  })
  @Patch(":candidateId/classification")
  async updateClassification(
    @CurrentUser("userId") userId: string,
    @Param() params: RejectCandidateParamDto,
    @Body() dto: UpdateClassificationDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.classificationService.updateClassifications(
        userId,
        params.candidateId,
        dto
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_WORKFLOW_CONTROLLER :: UPDATE_CLASSIFICATION : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  // Reinstate — move a REJECTED candidate back to a stage they previously held.
  //
  // Gated on CANDIDATE_REJECT on purpose: reinstate is the inverse of reject
  // and belongs to the same actor. Introducing a new permission string would
  // require seeding admin-managed role_permission master data, which would
  // silently deny every existing collaborator until that seed ran.
  //
  // MONEY: neither route touches Stripe or the transactions table.
  @RequirePermission(RECRUITMENT_PERMISSIONS.CANDIDATE_REJECT, {
    from: "candidate",
  })
  @Get(":candidateId/reinstate-options")
  async reinstateOptions(
    @Param() params: RejectCandidateParamDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.reinstateService.getReinstateOptions(
        params.candidateId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_WORKFLOW_CONTROLLER :: REINSTATE_OPTIONS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @RequirePermission(RECRUITMENT_PERMISSIONS.CANDIDATE_REJECT, {
    from: "candidate",
  })
  @Patch(":candidateId/reinstate")
  async reinstate(
    @CurrentUser("userId") userId: string,
    @Param() params: RejectCandidateParamDto,
    @Body() dto: ReinstateCandidateDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.reinstateService.reinstateCandidate(
        userId,
        params.candidateId,
        dto
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_WORKFLOW_CONTROLLER :: REINSTATE : ERROR : ${error}`
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }
}
