import { Module } from "@nestjs/common";
import { StripeModule } from "modules/stripe/stripe.module";
import { InterviewCostController } from "./interview-cost.controller";
import { FlatReferralFeeService } from "./services/flat-referral-fee.service";
import { ShortlistBreakdownService } from "./services/shortlist-breakdown.service";
import { RecruitmentCollaborationModule } from "../collaboration/recruitment-collaboration.module";

@Module({
  imports: [StripeModule, RecruitmentCollaborationModule],
  controllers: [InterviewCostController],
  providers: [FlatReferralFeeService, ShortlistBreakdownService],
  exports: [FlatReferralFeeService, ShortlistBreakdownService],
})
export class InterviewCostModule {}
