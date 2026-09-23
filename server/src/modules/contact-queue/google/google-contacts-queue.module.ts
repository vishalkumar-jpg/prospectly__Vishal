import { Module, forwardRef } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { isQueuesEnabled } from "config/redis-config";
import { UserConfigurationsModule } from "modules/user-configurations/user-configurations.module";
import { ClaimVerificationModule } from "modules/global-marketplace/claim";
import { TrustScoreQueueModule } from "modules/trust-score-queue/trust-score-queue.module";
import { JobPoolMatchesModule } from "modules/recruitment/job-pool-matches/job-pool-matches.module";
import { TypesenseSyncQueueModule } from "modules/typesense/sync-queue/typesense-sync-queue.module";
import { CreditsModule } from "modules/credits/credits.module";
import { GoogleContactsQueueService } from "./google-contacts-queue.service";
import { GoogleContactsQueueProcessor } from "./google-contacts-queue.processor";
import {
  GOOGLE_CONTACTS_QUEUE_NAME,
  GOOGLE_CONTACTS_QUEUE_CONFIG,
} from "./constants/google-contacts-queue.constants";
import { ContactsImportService } from "../contacts-import.service";
import { ContactsProviderTokensService } from "../contacts-provider-tokens.service";

const isRedisConfigured = isQueuesEnabled();

@Module({
  imports: [
    ...(isRedisConfigured
      ? [
          BullModule.registerQueue({
            name: GOOGLE_CONTACTS_QUEUE_NAME,
            defaultJobOptions: GOOGLE_CONTACTS_QUEUE_CONFIG.defaultJobOptions,
          }),
        ]
      : []),
    forwardRef(() => TrustScoreQueueModule),
    forwardRef(() => ClaimVerificationModule),
    forwardRef(() => JobPoolMatchesModule),
    TypesenseSyncQueueModule,
    CreditsModule,
    UserConfigurationsModule,
  ],
  providers: [
    ...(isRedisConfigured
      ? [GoogleContactsQueueService, GoogleContactsQueueProcessor]
      : []),
    ContactsImportService,
    ContactsProviderTokensService,
  ],
  exports: [
    ...(isRedisConfigured ? [GoogleContactsQueueService] : []),
    ContactsImportService,
    ContactsProviderTokensService,
  ],
})
export class GoogleContactsQueueModule {}
