import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  Res,
  Logger,
} from "@nestjs/common";
import responseUtils from "utils/response.utils";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import { Response } from "express";
import { DeclineRequestDto } from "modules/introduction-potential-connectors/introduction-potential-connectors.dto";
import { ApiTagsEnum } from "constants/api-tags.constants";
import {
  AcceptIntroductionRequestDto,
  MarkUnfulfilledDto,
} from "./workflow.dto";
import { WorkflowService } from "./workflow.service";
import { UnfulfillmentService } from "./unfulfillment.service";
import { RepublishService } from "./republish.service";
import { DeepLinkStatusService } from "./deep-link-status.service";
import { DeepLinkAction } from "./deep-link-status.response";

@ApiTags(ApiTagsEnum.IntroductionRequests)
@Controller("introduction-requests")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowController {
  private readonly logger = new Logger(WorkflowController.name);

  constructor(
    @Inject(WorkflowService)
    private readonly workflowService: WorkflowService,
    @Inject(UnfulfillmentService)
    private readonly unfulfillmentService: UnfulfillmentService,
    @Inject(RepublishService)
    private readonly republishService: RepublishService,
    @Inject(DeepLinkStatusService)
    private readonly deepLinkStatusService: DeepLinkStatusService
  ) {}

  @Get(":id/deep-link-status")
  async getDeepLinkStatus(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id") requestId: string,
    @Query("action") action: DeepLinkAction
  ) {
    try {
      const data = await this.deepLinkStatusService.getDeepLinkStatus(
        userId,
        requestId,
        action
      );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `WORKFLOW_CONTROLLER :: GET_DEEP_LINK_STATUS : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post(":id/accept")
  async acceptIntroductionRequest(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id") requestId: string,
    @Body() responseData: AcceptIntroductionRequestDto
  ) {
    try {
      await this.workflowService.acceptIntroductionRequest(
        userId,
        requestId,
        responseData
      );

      return responseUtils.success(res, {
        data: {
          success: true,
          message: "Introduction request accepted successfully",
          requestId,
        },
      });
    } catch (error) {
      this.logger.error(
        `WORKFLOW_CONTROLLER :: ACCEPT_INTRODUCTION_REQUEST : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post(":id/decline")
  async declineIntroductionRequest(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id") requestId: string,
    @Body() declineData: DeclineRequestDto
  ) {
    try {
      await this.workflowService.declineIntroductionRequest(
        userId,
        requestId,
        declineData
      );

      return responseUtils.success(res, {
        data: {
          success: true,
          message: "Introduction request declined successfully",
          requestId,
        },
      });
    } catch (error) {
      this.logger.error(
        `WORKFLOW_CONTROLLER :: DECLINE_INTRODUCTION_REQUEST : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post(":id/move-to-marketplace")
  async moveToMarketplace(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id") requestId: string
  ) {
    try {
      const result = await this.workflowService.moveToMarketplace(
        userId,
        requestId
      );

      return responseUtils.success(res, {
        data: result,
      });
    } catch (error) {
      this.logger.error(
        `WORKFLOW_CONTROLLER :: MOVE_TO_MARKETPLACE : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post(":id/republish")
  async republishRequest(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id") requestId: string
  ) {
    try {
      const result = await this.republishService.republishRequest(
        userId,
        requestId
      );

      return responseUtils.success(res, { data: result });
    } catch (error) {
      this.logger.error(
        `WORKFLOW_CONTROLLER :: REPUBLISH_REQUEST : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post(":id/mark-unfulfilled")
  async markUnfulfilled(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id") requestId: string,
    @Body() dto: MarkUnfulfilledDto
  ) {
    try {
      const result = await this.unfulfillmentService.markUnfulfilled(
        userId,
        requestId,
        dto
      );

      return responseUtils.success(res, {
        data: result,
      });
    } catch (error) {
      this.logger.error(
        `WORKFLOW_CONTROLLER :: MARK_UNFULFILLED : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
