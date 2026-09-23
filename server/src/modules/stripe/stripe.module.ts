import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { PayoutQueueModule } from "modules/payout-queue/payout-queue.module";
import { StripeController } from "./stripe.controller";
import { StripeService } from "./stripe.service";
import { StripeQueueModule } from "./stripe-queue/stripe-queue.module";
import { StripePayoutsModule } from "./payouts/stripe-payouts.module";

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => ProfilesModule),
    forwardRef(() => StripeQueueModule),
    forwardRef(() => PayoutQueueModule),
    StripePayoutsModule,
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService, StripeQueueModule, StripePayoutsModule],
})
export class StripeModule {}
