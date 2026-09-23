import { Module, Logger } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseModule } from "database/database.module";
import { AiUsageModule } from "modules/ai-usage/ai-usage.module";
import { APP_GUARD } from "@nestjs/core";
import { throttlerConfig } from "config/throttle.config";
import { AuthModule } from "modules/auth/auth.module";
import { JwtAuthGuard } from "guards/jwt-auth.guard";
import { CsrfGuard } from "guards/csrf.guard";
import { ModuleAccessGuard } from "guards/module-access.guard";
import { RecruitmentPermissionGuard } from "guards/recruitment-permission.guard";
import { ModuleAccessModule } from "modules/module-access/module-access.module";
import { ContactsModule } from "modules/contacts/contacts.module";
import { IntroductionsModule } from "modules/introductions/introductions.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { StripeModule } from "modules/stripe/stripe.module";
import { PaymentsModule } from "modules/payments/payments.module";
import { WebhooksModule } from "modules/webhooks/webhooks.module";
import { EmailsModule } from "modules/emails/emails.module";
import { BountyStagesModule } from "modules/bounty-stages/bounty-stages.module";
import { CalendarModule } from "modules/calendar/calendar.module";
import { FinancesModule } from "modules/finances/finances.module";
import { SubscriptionsModule } from "modules/subscriptions/subscriptions.module";
import { PayoutQueueModule } from "modules/payout-queue/payout-queue.module";
import { ContactQueueModule } from "modules/contact-queue/contact-queue.module";
import { IntroductionPotentialConnectorsModule } from "modules/introduction-potential-connectors/introduction-potential-connectors.module";
import { ContactSourceStatusModule } from "modules/contact-source-status/contact-source-status.module";
import { DashboardModule } from "modules/dashboard/dashboard.module";
import { GlobalMarketplaceModule } from "modules/global-marketplace/global-marketplace.module";
import { PrivacyModule } from "modules/profiles/privacy/privacy.module";
import { SystemFeedbackModule } from "modules/system-feedback/system-feedback.module";
import { MediaModule } from "modules/media/media.module";
import { UserConfigurationsModule } from "modules/user-configurations/user-configurations.module";
import { SharedModule } from "shared/shared.module";
import jwtConfig from "config/jwt.config";
import databaseConfig from "config/database.config";
import oauthConfig from "config/oauth.config";
import { isQueuesEnabled } from "config/redis-config";
import { RedisModule, REDIS_TOKEN } from "config/redis.module";
import { JwtStrategy } from "strategies/jwt.strategy";
import { PreSignedModule } from "modules/presigned/presigned.module";
import { SystemMaintenanceModule } from "modules/system-maintenance/system-maintenance.module";
import { RecruitmentModule } from "modules/recruitment/recruitment.module";
import { AccountDeletionModule } from "modules/account-deletion/account-deletion.module";
import type Redis from "ioredis";
import { AppController } from "./app.controller";
import { TrustScoreModule } from "./modules/trust-score/trust-score.module";
import { TrustScoreQueueModule } from "./modules/trust-score-queue/trust-score-queue.module";
import { SystemConfigurationModule } from "./modules/system-configuration/system-configuration.module";
import { CreditsModule } from "./modules/credits/credits.module";
import { BackfillModule } from "./modules/backfill/backfill.module";
import { DisputesModule } from "./modules/disputes/disputes.module";
import { TypesenseModule } from "./modules/typesense/typesense.module";
import { TypesenseSyncQueueModule } from "./modules/typesense/sync-queue/typesense-sync-queue.module";
import { ApolloModule } from "./modules/apollo/apollo.module";
import { NotificationPreferencesModule } from "./modules/notification-preferences/notification-preferences.module";

const logger = new Logger("AppModule");
const isRedisConfigured = isQueuesEnabled();

if (!isRedisConfigured) {
  logger.warn(
    "Queues disabled - Bull queue modules disabled. Background jobs will not run. Set ENABLE_QUEUES=true to enable."
  );
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig, databaseConfig, oauthConfig],
      envFilePath: ".env",
    }),

    DatabaseModule,
    AiUsageModule,

    ThrottlerModule.forRoot(throttlerConfig),

    ...(isRedisConfigured
      ? [
          RedisModule,
          BullModule.forRootAsync({
            imports: [RedisModule],
            useFactory: (redis: Redis) => {
              return {
                connection: redis,
              };
            },
            inject: [REDIS_TOKEN],
          }),
        ]
      : []),

    SharedModule,
    AuthModule,
    ContactsModule,
    IntroductionsModule,
    ProfilesModule,
    StripeModule,
    PaymentsModule,
    WebhooksModule,
    EmailsModule,
    BountyStagesModule,
    CalendarModule,
    FinancesModule,
    SubscriptionsModule,
    PayoutQueueModule,
    ContactQueueModule,
    TrustScoreQueueModule,
    TrustScoreModule,
    IntroductionPotentialConnectorsModule,
    ContactSourceStatusModule,
    DashboardModule,
    DisputesModule,
    GlobalMarketplaceModule,
    PrivacyModule,
    SystemFeedbackModule,
    MediaModule,
    PreSignedModule,
    UserConfigurationsModule,
    SystemConfigurationModule,
    CreditsModule,
    BackfillModule,
    SystemMaintenanceModule,
    RecruitmentModule,
    TypesenseModule,
    TypesenseSyncQueueModule,
    ApolloModule,
    AccountDeletionModule,
    ModuleAccessModule,
    NotificationPreferencesModule,
  ],

  controllers: [AppController],
  providers: [
    // Security: Global rate limiting to prevent brute force and DoS attacks
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    JwtStrategy,
    // Module-level access control (runs after JwtAuthGuard so req.user is set)
    {
      provide: APP_GUARD,
      useClass: ModuleAccessGuard,
    },
    // Recruitment resource-level permissions (@RequirePermission). Runs after
    // module access; resolves the job/candidate and attaches access to the request.
    {
      provide: APP_GUARD,
      useClass: RecruitmentPermissionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule {}
