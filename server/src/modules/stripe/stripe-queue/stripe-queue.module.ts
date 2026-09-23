import { Module, forwardRef } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { isQueuesEnabled } from "config/redis-config";
import { StripeQueueService } from "./stripe-queue.service";
import { StripeQueueProcessor } from "./stripe-queue.processor";
import {
  STRIPE_QUEUE_NAME,
  STRIPE_QUEUE_CONFIG,
} from "./stripe-queue.constants";
import { SubscriptionDbService } from "../../webhooks/stripe/services/subscription-db.service";
import { StripeModule } from "../stripe.module";

const isRedisConfigured = isQueuesEnabled();

@Module({
  imports: [
    ...(isRedisConfigured
      ? [
          BullModule.registerQueue({
            name: STRIPE_QUEUE_NAME,
            defaultJobOptions: STRIPE_QUEUE_CONFIG.defaultJobOptions,
          }),
        ]
      : []),
    forwardRef(() => StripeModule),
    forwardRef(() => ProfilesModule),
  ],
  providers: isRedisConfigured
    ? [StripeQueueService, StripeQueueProcessor, SubscriptionDbService]
    : [],
  exports: isRedisConfigured ? [StripeQueueService] : [],
})
export class StripeQueueModule {}
