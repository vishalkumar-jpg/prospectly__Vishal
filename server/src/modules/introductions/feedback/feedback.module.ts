import { Module, forwardRef } from "@nestjs/common";
import { PayoutQueueModule } from "modules/payout-queue";
import { TrustScoreQueueModule } from "modules/trust-score-queue/trust-score-queue.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { FinancesModule } from "modules/finances/finances.module";
import { MarketplacePayoutModule } from "modules/global-marketplace/payout";
import { FeedbackService } from "./feedback.service";
import { FeedbackSubmissionService } from "./feedback-submission.service";
import { FeedbackController } from "./feedback.controller";
import { FeedbackPayoutHelper } from "./payout-helper";
import { IntroductionsModule } from "../introductions.module";

@Module({
  imports: [
    PayoutQueueModule,
    TrustScoreQueueModule,
    ProfilesModule,
    FinancesModule,
    forwardRef(() => MarketplacePayoutModule),
    forwardRef(() => IntroductionsModule),
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService, FeedbackSubmissionService, FeedbackPayoutHelper],
  exports: [FeedbackService, FeedbackSubmissionService],
})
export class FeedbackModule {}
