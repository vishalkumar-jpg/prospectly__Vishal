import {
  Controller,
  Post,
  Get,
  UseGuards,
  Logger,
  Res,
  Body,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { CreatePayoutAccountDto } from "./payout-onboarding.dto";
import {
  StripeStatusService,
  StripeAccountService,
  StripeAccountLinkService,
  StripeDisconnectService,
} from "./services";

@ApiTags(ApiTagsEnum.Stripe)
@Controller("stripe")
@UseGuards(JwtAuthGuard)
export class StripePayoutsController {
  private readonly logger = new Logger(StripePayoutsController.name);

  constructor(
    private readonly statusService: StripeStatusService,
    private readonly accountService: StripeAccountService,
    private readonly accountLinkService: StripeAccountLinkService,
    private readonly disconnectService: StripeDisconnectService
  ) {}

  @Get("payouts/status")
  async getPayoutStatus(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.statusService.getStatus(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `STRIPE_PAYOUTS_CONTROLLER :: getPayoutStatus : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("payouts/account")
  async createPayoutAccount(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Body() body: CreatePayoutAccountDto
  ) {
    try {
      const data = await this.accountService.createAccount(userId, body);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `STRIPE_PAYOUTS_CONTROLLER :: createPayoutAccount : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Get("payouts/account-link")
  async getPayoutAccountLink(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.accountLinkService.getAccountLink(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `STRIPE_PAYOUTS_CONTROLLER :: getPayoutAccountLink : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }

  @Post("payouts/disconnect")
  async disconnectPayoutAccount(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const data = await this.disconnectService.disconnect(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `STRIPE_PAYOUTS_CONTROLLER :: disconnectPayoutAccount : ERROR : ${error}`
      );
      return responseUtils.error({ res, error });
    }
  }
}
