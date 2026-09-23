import { Module } from "@nestjs/common";
import { StripeModule } from "modules/stripe/stripe.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { SubscriptionsController } from "./subscriptions.controller";
import { SubscriptionsService } from "./subscriptions.service";
import { SubscriptionHistoryHelper } from "./helper/subscription-history.helper";

@Module({
  imports: [StripeModule, ProfilesModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionHistoryHelper],
  exports: [SubscriptionsService, SubscriptionHistoryHelper],
})
export class SubscriptionsModule {}
