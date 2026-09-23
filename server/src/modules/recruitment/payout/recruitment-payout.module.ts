import { Module, forwardRef } from "@nestjs/common";
import { CreditsModule } from "modules/credits/credits.module";
import { MediaModule } from "modules/media/media.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { StripeModule } from "modules/stripe/stripe.module";
import { RecruitmentPayoutController } from "./recruitment-payout.controller";
import { RecruitmentPayoutCreateService } from "./services/recruitment-payout-create.service";
import { RecruitmentPayoutOutcomeService } from "./services/recruitment-payout-outcome.service";
import { RecruitmentPayoutReleaseService } from "./services/recruitment-payout-release.service";
import { RecruitmentPayoutStateService } from "./services/recruitment-payout-state.service";
import { RecruitmentPayoutFundService } from "./services/recruitment-payout-fund.service";
import { RecruitmentFlatTopupService } from "./services/recruitment-flat-topup.service";
import { RecruitmentSuccessFeeTopupService } from "./services/recruitment-success-fee-topup.service";
import { RecruitmentPayoutSplitModule } from "./recruitment-payout-split.module";
import { RecruitmentPayoutQueueModule } from "../payout-queue/recruitment-payout-queue.module";
import { CandidateConnectorsModule } from "../candidate-connectors/candidate-connectors.module";
import { RecruitmentFeeConfigModule } from "../fee-config/recruitment-fee-config.module";
import { InterviewCostModule } from "../interview-cost/interview-cost.module";
import { RecruitmentCollaborationModule } from "../collaboration/recruitment-collaboration.module";
import { RecruitmentNotificationsModule } from "../notifications/recruitment-notifications.module";

@Module({
  imports: [
    RecruitmentCollaborationModule,
    RecruitmentNotificationsModule,
    CreditsModule,
    MediaModule,
    ProfilesModule,
    StripeModule,
    forwardRef(() => RecruitmentPayoutQueueModule),
    CandidateConnectorsModule,
    RecruitmentPayoutSplitModule,
    RecruitmentFeeConfigModule,
    InterviewCostModule,
  ],
  controllers: [RecruitmentPayoutController],
  providers: [
    RecruitmentPayoutCreateService,
    RecruitmentPayoutOutcomeService,
    RecruitmentPayoutReleaseService,
    RecruitmentPayoutStateService,
    RecruitmentPayoutFundService,
    RecruitmentFlatTopupService,
    RecruitmentSuccessFeeTopupService,
  ],
  exports: [RecruitmentPayoutCreateService],
})
export class RecruitmentPayoutModule {}
