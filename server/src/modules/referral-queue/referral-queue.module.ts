import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseModule } from "database/database.module";
import { ReferralQueueService } from "./referral-queue.service";
import { ReferralQueueProcessor } from "./referral-queue.processor";
import {
  REFERRAL_QUEUE_NAME,
  REFERRAL_QUEUE_CONFIG,
} from "./referral-queue.constants";
import { ReferralsModule } from "../referrals/referrals.module";
import { VerificationModule } from "../verification/verification.module";

@Module({
  imports: [
    BullModule.registerQueue({
      name: REFERRAL_QUEUE_NAME,
      defaultJobOptions: REFERRAL_QUEUE_CONFIG.defaultJobOptions,
    }),
    DatabaseModule,
    ReferralsModule,
    VerificationModule,
  ],
  providers: [ReferralQueueService, ReferralQueueProcessor],
  exports: [ReferralQueueService],
})
export class ReferralQueueModule {}
