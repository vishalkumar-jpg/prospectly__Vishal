import { Module } from "@nestjs/common";
import { StripeModule } from "modules/stripe/stripe.module";
import { TrustScoreQueueModule } from "modules/trust-score-queue/trust-score-queue.module";
import { FinancesModule } from "modules/finances/finances.module";
import { RefundsService } from "./refunds.service";

@Module({
  imports: [StripeModule, FinancesModule, TrustScoreQueueModule],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
