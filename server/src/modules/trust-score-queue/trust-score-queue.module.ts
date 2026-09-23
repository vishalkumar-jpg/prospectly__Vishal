import { Module, forwardRef } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseModule } from "database/database.module";
import { isQueuesEnabled } from "config/redis-config";
import { ContactSourceStatusModule } from "modules/contact-source-status/contact-source-status.module";
import { ResponseRateRecoveryService } from "modules/cron/trust-score/response-rate-recovery.service";
import {
  TRUST_SCORE_QUEUE_NAME,
  TRUST_SCORE_QUEUE_CONFIG,
} from "./trust-score-queue.constants";
import { TrustScoreQueueService } from "./trust-score-queue.service";
import { TrustScoreQueueProcessor } from "./trust-score-queue.processor";
import { TrustScoreService } from "./trust-score.service";
import { FeedbackTrustScoreService } from "./feedback-trust-score.service";
import { SuccessRateTrustScoreService } from "./success-rate-trust-score.service";

const isRedisConfigured = isQueuesEnabled();

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => ContactSourceStatusModule),
    BullModule.registerQueue({
      name: TRUST_SCORE_QUEUE_NAME,
      defaultJobOptions: TRUST_SCORE_QUEUE_CONFIG.defaultJobOptions,
    }),
  ],
  providers: [
    ...(isRedisConfigured ? [TrustScoreQueueService] : []),
    TrustScoreQueueProcessor,
    TrustScoreService,
    FeedbackTrustScoreService,
    SuccessRateTrustScoreService,
    ResponseRateRecoveryService,
  ],
  exports: [
    ...(isRedisConfigured ? [TrustScoreQueueService] : []),
    TrustScoreService,
    FeedbackTrustScoreService,
    SuccessRateTrustScoreService,
    ResponseRateRecoveryService,
  ],
})
export class TrustScoreQueueModule {}
