import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { CreditsModule } from "modules/credits/credits.module";
import { StripeModule } from "modules/stripe/stripe.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { RecruitmentPayoutQueueService } from "./recruitment-payout-queue.service";
import { RecruitmentPayoutQueueProcessor } from "./services/recruitment-payout-queue.processor";
import { RecruitmentPayoutCalculatorService } from "./services/recruitment-payout-calculator.service";
import { RecruitmentPayoutStripeHandlerService } from "./services/recruitment-payout-stripe-handler.service";
import { RECRUITMENT_PAYOUT_QUEUE_NAME } from "../payout/recruitment-payout.constants";
import { RecruitmentFeeConfigModule } from "../fee-config/recruitment-fee-config.module";
import { InterviewCostModule } from "../interview-cost/interview-cost.module";
import { RecruitmentNotificationsModule } from "../notifications/recruitment-notifications.module";

@Module({
  imports: [
    BullModule.registerQueue({ name: RECRUITMENT_PAYOUT_QUEUE_NAME }),
    CreditsModule,
    StripeModule,
    ProfilesModule,
    RecruitmentFeeConfigModule,
    RecruitmentNotificationsModule,
    // FlatReferralFeeService — the processor re-checks that the captured charges
    // cover the payout's grossed-up total before transferring.
    InterviewCostModule,
  ],
  providers: [
    RecruitmentPayoutQueueService,
    RecruitmentPayoutQueueProcessor,
    RecruitmentPayoutCalculatorService,
    RecruitmentPayoutStripeHandlerService,
  ],
  exports: [RecruitmentPayoutQueueService],
})
export class RecruitmentPayoutQueueModule {}
