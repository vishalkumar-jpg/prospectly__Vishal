import { Module, forwardRef } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { StripeModule } from "modules/stripe/stripe.module";
import { FinancesModule } from "modules/finances/finances.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { isQueuesEnabled } from "config/redis-config";
import { PayoutQueueService } from "./payout-queue.service";
import {
  PAYOUT_QUEUE_NAME,
  PAYOUT_QUEUE_CONFIG,
} from "./payout-queue.constants";

const isRedisConfigured = isQueuesEnabled();

@Module({
  imports: [
    ...(isRedisConfigured
      ? [
          BullModule.registerQueue({
            name: PAYOUT_QUEUE_NAME,
            defaultJobOptions: PAYOUT_QUEUE_CONFIG.defaultJobOptions,
          }),
        ]
      : []),
    forwardRef(() => StripeModule),
    forwardRef(() => FinancesModule),
    forwardRef(() => ProfilesModule),
  ],
  providers: [...(isRedisConfigured ? [PayoutQueueService] : [])],
  exports: isRedisConfigured ? [PayoutQueueService, BullModule] : [],
})
export class PayoutQueueModule {}
