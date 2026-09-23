import { Module, forwardRef } from "@nestjs/common";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { StripeModule } from "modules/stripe/stripe.module";
import { FinancesController } from "./finances.controller";
import { FinancesService } from "./finances.service";

/**
 * Module for financial transparency features
 * Provides APIs for transaction history, payout tracking, and payment details
 */
@Module({
  imports: [forwardRef(() => ProfilesModule), forwardRef(() => StripeModule)],
  controllers: [FinancesController],
  providers: [FinancesService],
  exports: [FinancesService],
})
export class FinancesModule {}
