import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseModule } from "database/database.module";
import { IntroductionNotificationsModule } from "modules/introductions/notifications/introduction-notifications.module";
import { CLAIM_VERIFICATION_QUEUE_NAME } from "./claim-verification.constants";
import { ClaimVerificationService } from "./claim-verification.service";
import { ClaimContactMatcherService } from "./claim-contact-matcher.service";
import { ClaimVerificationQueueService } from "./claim-verification-queue.service";
import { ClaimVerificationQueueProcessor } from "./claim-verification-queue.processor";

@Module({
  imports: [
    DatabaseModule,
    IntroductionNotificationsModule,
    BullModule.registerQueue({
      name: CLAIM_VERIFICATION_QUEUE_NAME,
    }),
  ],
  providers: [
    ClaimVerificationService,
    ClaimContactMatcherService,
    ClaimVerificationQueueService,
    ClaimVerificationQueueProcessor,
  ],
  exports: [
    ClaimVerificationService,
    ClaimContactMatcherService,
    ClaimVerificationQueueService,
  ],
})
export class ClaimVerificationModule {}
