import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PaymentsModule } from "modules/payments/payments.module";
import { StripeModule } from "modules/stripe/stripe.module";
import { ContactsModule } from "modules/contacts/contacts.module";
import { IntroductionPotentialConnectorsModule } from "modules/introduction-potential-connectors/introduction-potential-connectors.module";
import { FinancesModule } from "modules/finances/finances.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { CreateWithPaymentService } from "./create-with-payment.service";
import { CreateWithPaymentController } from "./create-with-payment.controller";
import { IntroductionPaymentFeeService } from "./introduction-payment-fee.service";
import { IntroductionsModule } from "../introductions.module";
import { FeedbackModule } from "../feedback/feedback.module";
import { IntroductionNotificationsModule } from "../notifications/introduction-notifications.module";

@Module({
  imports: [
    ConfigModule,
    IntroductionNotificationsModule,
    ProfilesModule,
    PaymentsModule,
    StripeModule,
    ContactsModule,
    IntroductionPotentialConnectorsModule,
    FinancesModule,
    forwardRef(() => IntroductionsModule),
    forwardRef(() => FeedbackModule),
  ],
  controllers: [CreateWithPaymentController],
  providers: [CreateWithPaymentService, IntroductionPaymentFeeService],
  exports: [CreateWithPaymentService, IntroductionPaymentFeeService],
})
export class CreateWithPaymentModule {}
