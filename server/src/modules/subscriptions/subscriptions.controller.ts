import {
  Controller,
  Get,
  Post,
  UseGuards,
  Inject,
  Res,
  Body,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { SubscriptionsService } from "./subscriptions.service";
import { GetSubscriptionHistoryQueryDto } from "./subscriptions.dto";
import { SubscriptionHistoryHelper } from "./helper/subscription-history.helper";

@ApiTags(ApiTagsEnum.Subscriptions)
@Controller("subscriptions")
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(
    @Inject(SubscriptionsService)
    private readonly subscriptionsService: SubscriptionsService,
    @Inject(SubscriptionHistoryHelper)
    private readonly subscriptionHistoryHelper: SubscriptionHistoryHelper
  ) {}

  @Get("plans")
  async getSubscriptionPlans(@Res() res: Response) {
    try {
      const data = await this.subscriptionsService.getSubscriptionPlans();
      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("current")
  async getCurrentSubscription(
    @CurrentUser("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      const data =
        await this.subscriptionsService.getCurrentSubscription(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Post("portal")
  async createPortalSession(
    @CurrentUser("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      const url =
        await this.subscriptionsService.createCustomerPortalSession(userId);
      return responseUtils.success(res, { data: { url } });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Post("upgrade-portal")
  async createUpgradePortalSession(
    @CurrentUser("userId") userId: string,
    @Body() body: { planId: string; interval: string },
    @Res() res: Response
  ) {
    try {
      const { planId, interval } = body;

      if (!planId || !interval) {
        return responseUtils.error({
          res,
          error: new Error("planId and interval are required"),
        });
      }

      const url = await this.subscriptionsService.createUpgradePortalSession(
        userId,
        planId,
        interval
      );
      return responseUtils.success(res, { data: { url } });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Post("sync")
  @ApiOperation({ summary: "Manually sync subscription status with Stripe" })
  @ApiResponse({ status: 200, description: "Subscription synced" })
  async syncSubscription(
    @CurrentUser("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      await this.subscriptionsService.syncSubscriptionStatus(userId);
      return responseUtils.success(res, {
        data: { message: "Subscription synced successfully" },
      });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("history")
  @ApiOperation({ summary: "Get subscription transaction history" })
  @ApiResponse({ status: 200, description: "Transaction history retrieved" })
  async getSubscriptionHistory(
    @CurrentUser("userId") userId: string,
    @Res() res: Response,
    @Query() query: GetSubscriptionHistoryQueryDto
  ) {
    try {
      const data = await this.subscriptionHistoryHelper.getSubscriptionHistory(
        userId,
        query
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }
}
