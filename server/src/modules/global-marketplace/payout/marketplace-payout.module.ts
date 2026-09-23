import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseModule } from "database/database.module";
import { StripeModule } from "modules/stripe/stripe.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { MARKETPLACE_PAYOUT_QUEUE_NAME } from "./marketplace-payout.constants";
import { MarketplacePayoutService } from "./marketplace-payout.service";
import { MarketplacePayoutQueueService } from "./marketplace-payout-queue.service";
import { MarketplacePayoutQueueProcessor } from "./marketplace-payout-queue.processor";
import { MarketplacePayoutHelper } from "./marketplace-payout-helper";

@Module({
  imports: [
    DatabaseModule,
    StripeModule,
    ProfilesModule,
    BullModule.registerQueue({
      name: MARKETPLACE_PAYOUT_QUEUE_NAME,
    }),
  ],
  providers: [
    MarketplacePayoutService,
    MarketplacePayoutQueueService,
    MarketplacePayoutQueueProcessor,
    MarketplacePayoutHelper,
  ],
  exports: [
    MarketplacePayoutService,
    MarketplacePayoutQueueService,
    MarketplacePayoutHelper,
  ],
})
export class MarketplacePayoutModule {}
