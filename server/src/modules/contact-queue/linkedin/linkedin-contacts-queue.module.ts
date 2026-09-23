import { Module, forwardRef } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { S3Service } from "shared/s3.service";
import { LinkedInCsvProcessorService } from "services/linkedin-csv-processor.service";
import { isQueuesEnabled } from "config/redis-config";
import { UserConfigurationsModule } from "modules/user-configurations/user-configurations.module";
import { TrustScoreQueueModule } from "modules/trust-score-queue/trust-score-queue.module";
import { ClaimVerificationModule } from "modules/global-marketplace/claim";
import { JobPoolMatchesModule } from "modules/recruitment/job-pool-matches/job-pool-matches.module";
import { TypesenseSyncQueueModule } from "modules/typesense/sync-queue/typesense-sync-queue.module";
import { CreditsModule } from "modules/credits/credits.module";
import { LinkedInContactsQueueService } from "./linkedin-contacts-queue.service";
import { LinkedInContactsQueueProcessor } from "./linkedin-contacts-queue.processor";
import {
  LINKEDIN_CONTACTS_QUEUE_NAME,
  LINKEDIN_CONTACTS_QUEUE_CONFIG,
} from "./constants/linkedin-contacts-queue.constants";
import { ContactsImportService } from "../contacts-import.service";

const isRedisConfigured = isQueuesEnabled();

@Module({
  imports: [
    ...(isRedisConfigured
      ? [
          BullModule.registerQueue({
            name: LINKEDIN_CONTACTS_QUEUE_NAME,
            defaultJobOptions: LINKEDIN_CONTACTS_QUEUE_CONFIG.defaultJobOptions,
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
      ? [LinkedInContactsQueueService, LinkedInContactsQueueProcessor]
      : []),
    ContactsImportService,
    S3Service,
    LinkedInCsvProcessorService,
  ],
  exports: [
    ...(isRedisConfigured ? [LinkedInContactsQueueService] : []),
    ContactsImportService,
    S3Service,
    LinkedInCsvProcessorService,
  ],
})
export class LinkedInContactsQueueModule {}
