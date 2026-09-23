import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { StripeModule } from "modules/stripe/stripe.module";
import { FinancesModule } from "modules/finances/finances.module";
import { PaymentsModule } from "modules/payments/payments.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { PayoutQueueModule } from "modules/payout-queue/payout-queue.module";
import { RecruitmentPayoutQueueModule } from "modules/recruitment/payout-queue/recruitment-payout-queue.module";
import { MarketplacePayoutModule } from "modules/global-marketplace/payout/marketplace-payout.module";
import { IntroductionsModule } from "modules/introductions/introductions.module";
import { SubscriptionsModule } from "modules/subscriptions/subscriptions.module";
import { EmailIntroductionModule } from "modules/introductions/email-introduction/email-introduction.module";
import { EmailsModule } from "modules/emails/emails.module";
import { CreditsModule } from "modules/credits/credits.module";
import { RecruitmentEmailLogsModule } from "modules/recruitment/email-logs/recruitment-email-logs.module";
import { NotificationPreferencesModule } from "modules/notification-preferences/notification-preferences.module";
import { WebhooksController } from "./webhooks.controller";
import { StripeWebhooksService } from "./stripe/stripe-webhooks.service";
import { ResendWebhooksService } from "./resend/resend-webhooks.service";
import { SubscriptionMapperService } from "./stripe/services/subscription-mapper.service";
import { SubscriptionDbService } from "./stripe/services/subscription-db.service";
import { SubscriptionUpdatedHandler } from "./stripe/handlers/subscription-updated.handler";
import { SubscriptionDeletedHandler } from "./stripe/handlers/subscription-deleted.handler";
import { InvoicePaidHandler } from "./stripe/handlers/invoice-paid.handler";
import { InvoiceFailedHandler } from "./stripe/handlers/invoice-failed.handler";
import { PayoutAccountUpdatedHandler } from "./stripe/handlers/payout-account-updated.handler";
import { OutboundPaymentStatusHandler } from "./stripe/handlers/outbound-payment-status.handler";
import { ChargeRefundedHandler } from "./stripe/handlers/charge-refunded.handler";

@Module({
  imports: [
    ConfigModule,
    StripeModule,
    FinancesModule,
    PaymentsModule,
    ProfilesModule,
    PayoutQueueModule,
    RecruitmentPayoutQueueModule,
    MarketplacePayoutModule,
    IntroductionsModule,
    SubscriptionsModule,
    EmailIntroductionModule,
    EmailsModule,
    CreditsModule,
    RecruitmentEmailLogsModule,
    NotificationPreferencesModule,
  ],
  controllers: [WebhooksController],
  providers: [
    StripeWebhooksService,
    ResendWebhooksService,
    SubscriptionMapperService,
    SubscriptionDbService,
    SubscriptionUpdatedHandler,
    SubscriptionDeletedHandler,
    InvoicePaidHandler,
    InvoiceFailedHandler,
    PayoutAccountUpdatedHandler,
    OutboundPaymentStatusHandler,
    ChargeRefundedHandler,
  ],
  exports: [SubscriptionMapperService, SubscriptionDbService],
})
export class WebhooksModule {}
