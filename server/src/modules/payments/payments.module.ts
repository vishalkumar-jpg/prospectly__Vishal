import { Module } from "@nestjs/common";
import { StripeModule } from "modules/stripe/stripe.module";
import { FinancesModule } from "modules/finances/finances.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { IntroductionPotentialConnectorsModule } from "modules/introduction-potential-connectors/introduction-potential-connectors.module";
import { PaymentsController } from "./payments.controller";
import { PaymentReauthorizationService } from "./payment-reauthorization.service";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [
    StripeModule,
    FinancesModule,
    ProfilesModule,
    IntroductionPotentialConnectorsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentReauthorizationService],
  exports: [PaymentsService, PaymentReauthorizationService],
})
export class PaymentsModule {}
