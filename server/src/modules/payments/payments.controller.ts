import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Inject,
  Logger,
  Res,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { PaymentsService } from "./payments.service";

@ApiTags("Payments")
@Controller("payments")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService
  ) {}

  @Post("create-intent")
  async createPaymentIntent(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() body: { requestId: string; amount: number }
  ) {
    try {
      const data = await this.paymentsService.createPaymentIntent(
        userId,
        body.requestId,
        body.amount
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(`Error creating payment intent: ${error.message}`);
      return responseUtils.error({ res, error });
    }
  }

  @Post("capture/:requestId")
  async capturePayment(
    @Res() res: Response,
    @Param("requestId") requestId: string,
    @CurrentUser("userId") userId: string,
    @Body() body: { amount?: number }
  ) {
    try {
      const data = await this.paymentsService.capturePayment(
        userId,
        requestId,
        body.amount
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(`Error capturing payment: ${error.message}`);
      return responseUtils.error({ res, error });
    }
  }

  @Post("payout/:requestId")
  async processPayout(
    @Res() res: Response,
    @Param("requestId") requestId: string,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.paymentsService.processPayout(userId, requestId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(`Error processing payout: ${error.message}`);
      return responseUtils.error({ res, error });
    }
  }
}
