import { Module } from "@nestjs/common";
import { RecruitmentPayoutSplitService } from "./services/recruitment-payout-split.service";
import { ConnectorOriginsModule } from "../connector-origins/connector-origins.module";

// Standalone module for the split-decision service so it can be imported by
// both the payout module (payout creation) and the consent module (candidate
// creation) without dragging the full payout module in and risking cycles.
@Module({
  imports: [ConnectorOriginsModule],
  providers: [RecruitmentPayoutSplitService],
  exports: [RecruitmentPayoutSplitService],
})
export class RecruitmentPayoutSplitModule {}
