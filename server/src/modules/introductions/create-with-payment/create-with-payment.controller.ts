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
  ParseFloatPipe,
} from "@nestjs/common";
import responseUtils from "utils/response.utils";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { ActiveRequestLimitGuard } from "guards/active-request-limit.guard";
import { PendingFeedbackGuard } from "guards/pending-feedback.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { CreateIntroductionWithPaymentDto } from "./create-with-payment.dto";
import { CreateWithPaymentService } from "./create-with-payment.service";
import { IntroductionPaymentFeeService } from "./introduction-payment-fee.service";

@ApiTags(ApiTagsEnum.IntroductionRequests)
@Controller("introduction-requests")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CreateWithPaymentController {
  private readonly logger = new Logger(CreateWithPaymentController.name);

  constructor(
    @Inject(CreateWithPaymentService)
    private readonly createWithPaymentService: CreateWithPaymentService,
    private readonly introductionPaymentFeeService: IntroductionPaymentFeeService
  ) {}

  @Get("calculate-payment-fees")
  async calculatePaymentFees(
    @Res() res: Response,
    @Query("bounty", ParseFloatPipe) bounty: number
  ) {
    try {
      const data = this.introductionPaymentFeeService.calculateFees(bounty);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CREATE_WITH_PAYMENT_CONTROLLER :: CALCULATE_PAYMENT_FEES : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get(":contactId/check-ownership")
  async checkContactOwnership(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("contactId") contactId: string
  ) {
    try {
      const isOwned = await this.createWithPaymentService.checkContactOwnership(
        userId,
        parseInt(contactId, 10)
      );
      return responseUtils.success(res, { data: { isOwned } });
    } catch (error) {
      this.logger.error(
        `CREATE_WITH_PAYMENT_CONTROLLER :: CHECK_CONTACT_OWNERSHIP : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("create-with-payment")
  @UseGuards(ActiveRequestLimitGuard, PendingFeedbackGuard)
  async createIntroductionWithPayment(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() createDto: CreateIntroductionWithPaymentDto
  ) {
    try {
      const data =
        await this.createWithPaymentService.createIntroductionWithPayment(
          userId,
          createDto
        );

      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CREATE_WITH_PAYMENT_CONTROLLER :: CREATE_INTRODUCTION_WITH_PAYMENT : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
