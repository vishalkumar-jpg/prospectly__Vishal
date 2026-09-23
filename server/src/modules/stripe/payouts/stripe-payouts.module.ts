import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { StripePayoutsController } from "./stripe-payouts.controller";
import {
  StripePayoutsService,
  StripeOnboardingService,
  StripeStatusService,
  StripeAccountService,
  StripeAccountLinkService,
  StripeDisconnectService,
} from "./services";

@Module({
  imports: [ConfigModule, forwardRef(() => ProfilesModule)],
  controllers: [StripePayoutsController],
  providers: [
    StripePayoutsService,
    StripeOnboardingService,
    StripeStatusService,
    StripeAccountService,
    StripeAccountLinkService,
    StripeDisconnectService,
  ],
  exports: [StripePayoutsService],
})
export class StripePayoutsModule {}
