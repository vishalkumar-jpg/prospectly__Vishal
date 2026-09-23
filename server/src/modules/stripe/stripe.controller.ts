import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  UseGuards,
  Inject,
  Res,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CurrentUser } from "decorators/current-user.decorator";
import { ProfilesService } from "modules/profiles/profiles.service";
import responseUtils from "utils/response.utils";
import { Response } from "express";
import { utcDayjs } from "utils/dayjs";
import { AnyType } from "types/common";
import { ApiTagsEnum } from "constants/api-tags.constants";
import { StripeService } from "./stripe.service";

@ApiTags(ApiTagsEnum.Stripe)
@Controller("stripe")
@UseGuards(JwtAuthGuard)
export class StripeController {
  constructor(
    @Inject(StripeService) private readonly stripeService: StripeService,
    @Inject(ProfilesService) private readonly profilesService: ProfilesService
  ) {}

  @Post("setup-intent")
  async createSetupIntent(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const profile = await this.profilesService.getProfileById(userId);

      // Get or create Stripe customer ID
      let customerId = profile?.stripeCustomerId;
      if (!customerId) {
        const customer = await this.stripeService.createCustomer(
          profile?.email || "",
          profile?.fullName || "",
          { userId }
        );
        customerId = customer.id;
        await this.profilesService.updateProfile(userId, {
          stripeCustomerId: customerId,
        } as AnyType);
      }

      const setupIntent =
        await this.stripeService.createSetupIntent(customerId);

      return responseUtils.success(res, {
        data: { clientSecret: setupIntent.client_secret },
      });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Post("payment-methods/:id/attach")
  async attachPaymentMethod(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id") paymentMethodId: string
  ) {
    try {
      const profile = await this.profilesService.getProfileById(userId);
      if (!profile?.stripeCustomerId) {
        throw new Error("Stripe customer not found");
      }

      const paymentMethod = await this.stripeService.attachPaymentMethod(
        paymentMethodId,
        profile.stripeCustomerId
      );

      await this.stripeService.setDefaultPaymentMethod(
        profile.stripeCustomerId,
        paymentMethodId
      );

      await this.profilesService.updateProfile(userId, {
        stripePrimaryPaymentMethodId: paymentMethodId,
      } as AnyType);

      return responseUtils.success(res, {
        data: {
          paymentMethod,
          message: "Payment method attached successfully",
        },
      });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("payment-methods")
  async listPaymentMethods(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const profile = await this.profilesService.getProfileById(userId);
      if (!profile?.stripeCustomerId) {
        return responseUtils.success(res, {
          data: { paymentMethods: [], primaryPaymentMethodId: null },
        });
      }

      const stripePaymentMethods = await this.stripeService.listPaymentMethods(
        profile.stripeCustomerId
      );

      // Transform Stripe payment methods to frontend format
      const paymentMethods = stripePaymentMethods.map((pm: AnyType) => {
        const now = utcDayjs();
        const expYear = pm.card?.exp_year || 0;
        const expMonth = pm.card?.exp_month || 0;
        const isExpired =
          expYear < now.year() ||
          (expYear === now.year() && expMonth < now.month() + 1);

        return {
          id: pm.id,
          brand: pm.card?.brand || "unknown",
          last4: pm.card?.last4 || "0000",
          expMonth,
          expYear,
          isPrimary: pm.id === profile.stripePrimaryPaymentMethodId,
          isExpired,
        };
      });

      return responseUtils.success(res, {
        data: {
          paymentMethods,
          primaryPaymentMethodId: profile.stripePrimaryPaymentMethodId,
        },
      });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Get("payment-methods/primary")
  async getPrimaryPaymentMethod(
    @Res() res: Response,
    @CurrentUser("userId") userId: string
  ) {
    try {
      const profile = await this.profilesService.getProfileById(userId);
      if (!profile?.stripeCustomerId || !profile.stripePrimaryPaymentMethodId) {
        return responseUtils.success(res, { data: { paymentMethod: null } });
      }

      const stripePaymentMethods = await this.stripeService.listPaymentMethods(
        profile.stripeCustomerId
      );
      const primaryPaymentMethod = stripePaymentMethods.find(
        (pm: AnyType) => pm.id === profile.stripePrimaryPaymentMethodId
      );

      if (!primaryPaymentMethod) {
        return responseUtils.success(res, { data: { paymentMethod: null } });
      }

      const now = utcDayjs();
      const expYear = primaryPaymentMethod.card?.exp_year || 0;
      const expMonth = primaryPaymentMethod.card?.exp_month || 0;
      const isExpired =
        expYear < now.year() ||
        (expYear === now.year() && expMonth < now.month() + 1);

      return responseUtils.success(res, {
        data: {
          paymentMethod: {
            id: primaryPaymentMethod.id,
            brand: primaryPaymentMethod.card?.brand || "unknown",
            last4: primaryPaymentMethod.card?.last4 || "0000",
            expMonth,
            expYear,
            isPrimary: true,
            isExpired,
          },
        },
      });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Patch("payment-methods/:id/set-default")
  async setDefaultPaymentMethod(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id") paymentMethodId: string
  ) {
    try {
      const profile = await this.profilesService.getProfileById(userId);
      if (!profile?.stripeCustomerId) {
        throw new Error("Stripe customer not found");
      }

      await this.stripeService.setDefaultPaymentMethod(
        profile.stripeCustomerId,
        paymentMethodId
      );

      await this.profilesService.updateProfile(userId, {
        stripePrimaryPaymentMethodId: paymentMethodId,
      } as AnyType);

      return responseUtils.success(res, {
        data: { message: "Payment method set as default successfully" },
      });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }

  @Delete("payment-methods/:id")
  async detachPaymentMethod(
    @Res() res: Response,
    @CurrentUser("userId") userId: string,
    @Param("id") paymentMethodId: string
  ) {
    try {
      await this.stripeService.detachPaymentMethod(paymentMethodId);

      const profile = await this.profilesService.getProfileById(userId);
      if (profile?.stripePrimaryPaymentMethodId === paymentMethodId) {
        await this.profilesService.updateProfile(userId, {
          stripePrimaryPaymentMethodId: null,
        } as AnyType);
      }

      return responseUtils.success(res, {
        data: { message: "Payment method detached successfully" },
      });
    } catch (error) {
      return responseUtils.error({ res, error });
    }
  }
}
