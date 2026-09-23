import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PaymentsModule } from "modules/payments/payments.module";
import { StripeModule } from "modules/stripe/stripe.module";
import { EmailsModule } from "modules/emails/emails.module";
import { CalendarModule } from "modules/calendar/calendar.module";
import { BountyStagesModule } from "modules/bounty-stages/bounty-stages.module";
import { IntroductionPotentialConnectorsModule } from "modules/introduction-potential-connectors/introduction-potential-connectors.module";
import { ContactsModule } from "modules/contacts/contacts.module";
import { FinancesModule } from "modules/finances/finances.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { PayoutQueueModule } from "modules/payout-queue";
import { TrustScoreQueueModule } from "modules/trust-score-queue/trust-score-queue.module";
import { IntroductionsService } from "./introductions.service";
import { IntroductionRequestsController } from "./introductions.controller";
import { CreateWithPaymentModule } from "./create-with-payment/create-with-payment.module";
import { FeedbackModule } from "./feedback/feedback.module";
import { MeetingModule } from "./meeting/meeting.module";
import { EmailIntroductionModule } from "./email-introduction/email-introduction.module";
import { WorkflowModule } from "./workflow/workflow.module";
import { RequesterPipelineModule } from "./requester-pipeline/requester-pipeline.module";
import { BountyCalculatorModule } from "./bounty-calculator/bounty-calculator.module";
import { ContactEnrichmentModule } from "./contact-enrichment/contact-enrichment.module";
import { ContactOrganizationEnricherService } from "./services/contact-organization-enricher.service";
import { IntroductionNotificationsModule } from "./notifications/introduction-notifications.module";

@Module({
  imports: [
    ConfigModule,
    IntroductionNotificationsModule,
    ProfilesModule,
    PaymentsModule,
    StripeModule,
    EmailsModule,
    CalendarModule,
    BountyStagesModule,
    IntroductionPotentialConnectorsModule,
    ContactsModule,
    FinancesModule,
    PayoutQueueModule,
    TrustScoreQueueModule,
    forwardRef(() => CreateWithPaymentModule),
    forwardRef(() => FeedbackModule),
    forwardRef(() => MeetingModule),
    forwardRef(() => EmailIntroductionModule),
    forwardRef(() => WorkflowModule),
    RequesterPipelineModule,
    BountyCalculatorModule,
    ContactEnrichmentModule,
  ],
  controllers: [IntroductionRequestsController],
  providers: [IntroductionsService, ContactOrganizationEnricherService],
  exports: [
    IntroductionsService,
    ContactOrganizationEnricherService,
    IntroductionNotificationsModule,
  ],
})
export class IntroductionsModule {}
