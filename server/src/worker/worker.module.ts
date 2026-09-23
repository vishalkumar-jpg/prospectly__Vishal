import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseModule } from "database/database.module";
import { AiUsageModule } from "modules/ai-usage/ai-usage.module";
import jwtConfig from "config/jwt.config";
import databaseConfig from "config/database.config";
import oauthConfig from "config/oauth.config";
import { RedisModule, REDIS_TOKEN } from "config/redis.module";

// Queue Processors
import { PayoutQueueProcessor } from "modules/payout-queue/payout-queue.processor";
import { GoogleContactsQueueProcessor } from "modules/contact-queue/google/google-contacts-queue.processor";
import { MicrosoftContactsQueueProcessor } from "modules/contact-queue/microsoft/microsoft-contacts-queue.processor";
import { AppleContactsQueueProcessor } from "modules/contact-queue/apple/apple-contacts-queue.processor";
import { LinkedInContactsQueueProcessor } from "modules/contact-queue/linkedin/linkedin-contacts-queue.processor";
import { TrustScoreQueueProcessor } from "modules/trust-score-queue/trust-score-queue.processor";
import { TypesenseSyncQueueProcessor } from "modules/typesense/sync-queue/typesense-sync-queue.processor";
import { TypesenseSyncQueueService } from "modules/typesense/sync-queue/typesense-sync-queue.service";

// Queue Constants
import {
  PAYOUT_QUEUE_NAME,
  PAYOUT_QUEUE_CONFIG,
} from "modules/payout-queue/payout-queue.constants";
import {
  GOOGLE_CONTACTS_QUEUE_NAME,
  GOOGLE_CONTACTS_QUEUE_CONFIG,
} from "modules/contact-queue/google/constants/google-contacts-queue.constants";
import {
  MICROSOFT_CONTACTS_QUEUE_NAME,
  MICROSOFT_CONTACTS_QUEUE_CONFIG,
} from "modules/contact-queue/microsoft/constants/microsoft-contacts-queue.constants";
import {
  APPLE_CONTACTS_QUEUE_NAME,
  APPLE_CONTACTS_QUEUE_CONFIG,
} from "modules/contact-queue/apple/constants/apple-contacts-queue.constants";
import {
  LINKEDIN_CONTACTS_QUEUE_NAME,
  LINKEDIN_CONTACTS_QUEUE_CONFIG,
} from "modules/contact-queue/linkedin/constants/linkedin-contacts-queue.constants";
import {
  TRUST_SCORE_QUEUE_NAME,
  TRUST_SCORE_QUEUE_CONFIG,
} from "modules/trust-score-queue/trust-score-queue.constants";

// Job Pool Match Queue
import { JobPoolMatchQueueProcessor } from "modules/recruitment/job-pool-matches/job-pool-match-queue.processor";
import { JobPoolMatchesComputeService } from "modules/recruitment/job-pool-matches/services/job-pool-matches-compute.service";
import { EmbeddingModule } from "modules/recruitment/job-pool-matches/embedding.module";
import { LlmScoringService } from "modules/recruitment/job-pool-matches/services/llm-scoring.service";
import { JobPoolMatchQueueService } from "modules/recruitment/job-pool-matches/job-pool-match-queue.service";
import {
  JOB_POOL_MATCH_QUEUE_NAME,
  JOB_POOL_MATCH_QUEUE_CONFIG,
} from "modules/recruitment/job-pool-matches/job-pool-matches.constants";
import {
  TYPESENSE_SYNC_QUEUE_NAME,
  TYPESENSE_SYNC_QUEUE_CONFIG,
} from "modules/typesense/sync-queue/constants/typesense-sync-queue.constants";
import { ResumeExtractionQueueProcessor } from "modules/recruitment/resume-extraction/resume-extraction-queue.processor";
import { CandidateEvaluationQueueProcessor } from "modules/recruitment/candidate-evaluation/candidate-evaluation-queue.processor";
import { ResumeExtractionAiService } from "modules/recruitment/resume-extraction/services/resume-extraction-ai.service";
import { ResumeExtractionLinkedinSyncService } from "modules/recruitment/resume-extraction/services/resume-extraction-linkedin-sync.service";
import { ResumeExtractionMutationService } from "modules/recruitment/resume-extraction/services/resume-extraction-mutation.service";
import {
  RESUME_EXTRACTION_QUEUE_NAME,
  RESUME_EXTRACTION_QUEUE_CONFIG,
} from "modules/recruitment/resume-extraction/resume-extraction.constants";
import {
  CANDIDATE_EVALUATION_QUEUE_NAME,
  CANDIDATE_EVALUATION_QUEUE_CONFIG,
} from "modules/recruitment/candidate-evaluation/candidate-evaluation.constants";

// Connector Upload Queue
import { ConnectorUploadQueueProcessor } from "modules/recruitment/connector-upload/connector-upload-queue.processor";
import { ConnectorUploadReplaceQueueProcessor } from "modules/recruitment/connector-upload/connector-upload-replace-queue.processor";
import { ConnectorUploadPdfService } from "modules/recruitment/connector-upload/services/connector-upload-pdf.service";
import { ConnectorUploadEvaluationService } from "modules/recruitment/connector-upload/services/connector-upload-evaluation.service";
import { ConnectorUploadMatchResultsService } from "modules/recruitment/connector-upload/services/connector-upload-match-results.service";
import { ConnectorUploadReplacePostAcceptService } from "modules/recruitment/connector-upload/services/connector-upload-replace-post-accept.service";
import { ConnectorUploadReplaceMovementService } from "modules/recruitment/connector-upload/services/connector-upload-replace-movement.service";
import { ResumeIndexingModule } from "modules/recruitment/resume-indexing/resume-indexing.module";
import { ResumeIndexingQueueModule } from "modules/recruitment/resume-indexing/resume-indexing-queue.module";
import { ResumeIndexingQueueProcessor } from "modules/recruitment/resume-indexing/resume-indexing-queue.processor";
import {
  RESUME_INDEXING_QUEUE_NAME,
  RESUME_INDEXING_QUEUE_CONFIG,
} from "modules/recruitment/resume-indexing/resume-indexing.constants";
import { ConnectorUploadContactService } from "modules/recruitment/connector-upload/services/connector-upload-contact.service";
import {
  CONNECTOR_UPLOAD_QUEUE_NAME,
  CONNECTOR_UPLOAD_QUEUE_CONFIG,
} from "modules/recruitment/connector-upload/connector-upload.constants";

// Recruitment Notification Queue
import { RecruitmentNotificationQueueProcessor } from "modules/recruitment/notifications/recruitment-notification-queue.processor";
import {
  RECRUITMENT_NOTIFICATION_QUEUE_NAME,
  RECRUITMENT_NOTIFICATION_QUEUE_CONFIG,
} from "modules/recruitment/notifications/recruitment-notifications.constants";
import {
  RECRUITMENT_EMAIL_LOG_PERSIST_QUEUE_NAME,
  RECRUITMENT_EMAIL_LOG_PERSIST_QUEUE_CONFIG,
} from "modules/recruitment/email-logs/recruitment-email-logs.constants";
import { RecruitmentEmailLogPersistQueueProcessor } from "modules/recruitment/email-logs/recruitment-email-log-persist-queue.processor";
import {
  CONSENT_UPDATE_EMAIL_SEND_QUEUE_NAME,
  CONSENT_UPDATE_EMAIL_SEND_QUEUE_CONFIG,
} from "modules/recruitment/consent/consent-email-send.constants";
import { ConsentEmailSendQueueProcessor } from "modules/recruitment/consent/consent-email-send-queue.processor";
import { ConsentEmailSendQueueModule } from "modules/recruitment/consent/consent-email-send-queue.module";
import { IntroductionNotificationQueueProcessor } from "modules/introductions/notifications/introduction-notification-queue.processor";
import {
  INTRODUCTION_NOTIFICATION_QUEUE_NAME,
  INTRODUCTION_NOTIFICATION_QUEUE_CONFIG,
} from "modules/introductions/notifications/introduction-notifications.constants";
import { RecruitmentFeeConfigModule } from "modules/recruitment/fee-config/recruitment-fee-config.module";
import { RecruitmentNotificationsModule } from "modules/recruitment/notifications/recruitment-notifications.module";
import { RecruitmentEmailLogsModule } from "modules/recruitment/email-logs/recruitment-email-logs.module";
import { ContactsModule } from "modules/contacts/contacts.module";
import { AccountDeletionWorkerModule } from "modules/account-deletion/account-deletion-worker.module";
// Recruitment Payout Queue
import { RecruitmentPayoutQueueModule } from "modules/recruitment/payout-queue/recruitment-payout-queue.module";

// Modules required by processors (minimal set)
import { JobExtractionModule } from "modules/recruitment/job-extraction/job-extraction.module";
import { ResumeExtractionModule } from "modules/recruitment/resume-extraction/resume-extraction.module";
import { CandidateEvaluationModule } from "modules/recruitment/candidate-evaluation/candidate-evaluation.module";
import { ConsentModule } from "modules/recruitment/consent";
import { IntroductionsModule } from "modules/introductions/introductions.module";
import { StripeModule } from "modules/stripe/stripe.module";
import { FinancesModule } from "modules/finances/finances.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { EmailsModule } from "modules/emails/emails.module";
import { SharedModule } from "shared/shared.module";
import { BountyStagesModule } from "modules/bounty-stages/bounty-stages.module";
import { CronModule } from "modules/cron/cron.module";
import { TrustScoreQueueModule } from "modules/trust-score-queue/trust-score-queue.module";
import { CreditsModule } from "modules/credits/credits.module";
import { BackfillModule } from "modules/backfill/backfill.module";
import { TypesenseModule } from "modules/typesense/typesense.module";
import { UserConfigurationsModule } from "modules/user-configurations/user-configurations.module";

// Services required by Contact Queue Processors
import { ContactsImportService } from "modules/contact-queue/contacts-import.service";
import { ContactsProviderTokensService } from "modules/contact-queue/contacts-provider-tokens.service";

// Cron Services
import { CalendarService } from "modules/calendar/calendar.service";
import { CalendarTokenService } from "modules/calendar/shared/calendar-token.service";
import { GoogleCalendarService } from "modules/calendar/google/google-calendar.service";
import { MicrosoftCalendarService } from "modules/calendar/microsoft/microsoft-calendar.service";
import { ScheduledMeetingService } from "modules/calendar/shared/scheduled-meeting.service";

// Services
import { S3Service } from "shared/s3.service";
import { LinkedInCsvProcessorService } from "services/linkedin-csv-processor.service";
import { MicrosoftCalendarValidationService } from "modules/calendar/microsoft/microsoft-calendar.validation.service";
import { MicrosoftMeetingBookingService } from "modules/calendar/microsoft/microsoft-meeting-booking.service";
import type Redis from "ioredis";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig, databaseConfig, oauthConfig],
      envFilePath: ".env",
    }),

    DatabaseModule,

    AiUsageModule,

    EmbeddingModule,

    ResumeIndexingModule,

    ResumeIndexingQueueModule,

    ScheduleModule.forRoot(),

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

    // Register all queues for processing
    BullModule.registerQueue(
      {
        name: PAYOUT_QUEUE_NAME,
        defaultJobOptions: PAYOUT_QUEUE_CONFIG.defaultJobOptions,
      },
      {
        name: GOOGLE_CONTACTS_QUEUE_NAME,
        defaultJobOptions: GOOGLE_CONTACTS_QUEUE_CONFIG.defaultJobOptions,
      },
      {
        name: MICROSOFT_CONTACTS_QUEUE_NAME,
        defaultJobOptions: MICROSOFT_CONTACTS_QUEUE_CONFIG.defaultJobOptions,
      },
      {
        name: APPLE_CONTACTS_QUEUE_NAME,
        defaultJobOptions: APPLE_CONTACTS_QUEUE_CONFIG.defaultJobOptions,
      },
      {
        name: LINKEDIN_CONTACTS_QUEUE_NAME,
        defaultJobOptions: LINKEDIN_CONTACTS_QUEUE_CONFIG.defaultJobOptions,
      },
      {
        name: TRUST_SCORE_QUEUE_NAME,
        defaultJobOptions: TRUST_SCORE_QUEUE_CONFIG.defaultJobOptions,
      },
      {
        name: JOB_POOL_MATCH_QUEUE_NAME,
        defaultJobOptions: JOB_POOL_MATCH_QUEUE_CONFIG.defaultJobOptions,
      },
      {
        name: TYPESENSE_SYNC_QUEUE_NAME,
        defaultJobOptions: TYPESENSE_SYNC_QUEUE_CONFIG.defaultJobOptions,
      },
      {
        name: RESUME_EXTRACTION_QUEUE_NAME,
        defaultJobOptions: RESUME_EXTRACTION_QUEUE_CONFIG.defaultJobOptions,
      },
      {
        name: RESUME_INDEXING_QUEUE_NAME,
        defaultJobOptions: RESUME_INDEXING_QUEUE_CONFIG.defaultJobOptions,
      },
      {
        name: CANDIDATE_EVALUATION_QUEUE_NAME,
        defaultJobOptions: CANDIDATE_EVALUATION_QUEUE_CONFIG.defaultJobOptions,
      },
      {
        name: CONNECTOR_UPLOAD_QUEUE_NAME,
        defaultJobOptions: CONNECTOR_UPLOAD_QUEUE_CONFIG.defaultJobOptions,
      },
      {
        name: RECRUITMENT_NOTIFICATION_QUEUE_NAME,
        defaultJobOptions:
          RECRUITMENT_NOTIFICATION_QUEUE_CONFIG.defaultJobOptions,
      },
      {
        name: INTRODUCTION_NOTIFICATION_QUEUE_NAME,
        defaultJobOptions:
          INTRODUCTION_NOTIFICATION_QUEUE_CONFIG.defaultJobOptions,
      },
      {
        name: RECRUITMENT_EMAIL_LOG_PERSIST_QUEUE_NAME,
        defaultJobOptions:
          RECRUITMENT_EMAIL_LOG_PERSIST_QUEUE_CONFIG.defaultJobOptions,
      },
      {
        name: CONSENT_UPDATE_EMAIL_SEND_QUEUE_NAME,
        defaultJobOptions:
          CONSENT_UPDATE_EMAIL_SEND_QUEUE_CONFIG.defaultJobOptions,
      }
    ),

    // Core modules

    // Modules required by PayoutQueueProcessor
    forwardRef(() => IntroductionsModule), // Has many dependencies, import as module
    StripeModule,
    FinancesModule,
    ProfilesModule,
    EmailsModule,
    SharedModule,
    ContactsModule,
    CreditsModule,
    BackfillModule,
    JobExtractionModule,
    ResumeExtractionModule,
    CandidateEvaluationModule,
    ConsentModule,
    RecruitmentNotificationsModule,
    RecruitmentEmailLogsModule,
    RecruitmentFeeConfigModule,
    ConsentEmailSendQueueModule,

    // Modules required by Contact Queue Processors
    TrustScoreQueueModule,
    TypesenseModule,
    UserConfigurationsModule,

    // Modules required by Cron
    BountyStagesModule,
    CronModule,
    RecruitmentPayoutQueueModule,
    AccountDeletionWorkerModule,
  ],
  providers: [
    // Queue Processors
    PayoutQueueProcessor,
    GoogleContactsQueueProcessor,
    MicrosoftContactsQueueProcessor,
    AppleContactsQueueProcessor,
    LinkedInContactsQueueProcessor,
    TrustScoreQueueProcessor,
    JobPoolMatchQueueProcessor,
    TypesenseSyncQueueProcessor,
    ResumeExtractionQueueProcessor,
    ResumeIndexingQueueProcessor,
    CandidateEvaluationQueueProcessor,
    ConnectorUploadQueueProcessor,
    RecruitmentNotificationQueueProcessor,
    IntroductionNotificationQueueProcessor,
    RecruitmentEmailLogPersistQueueProcessor,
    ConsentEmailSendQueueProcessor,
    // Services for Contact Queue Processors
    ContactsImportService,
    ContactsProviderTokensService,
    CalendarTokenService,
    GoogleCalendarService,
    MicrosoftCalendarService,
    MicrosoftCalendarValidationService,
    ScheduledMeetingService,
    S3Service,
    LinkedInCsvProcessorService,

    // Typesense Sync Queue Service
    TypesenseSyncQueueService,

    // Job Pool Match Services
    LlmScoringService,
    JobPoolMatchesComputeService,
    JobPoolMatchQueueService,

    ResumeExtractionAiService,
    ResumeExtractionMutationService,
    ResumeExtractionLinkedinSyncService,
    ConnectorUploadContactService,
    ConnectorUploadPdfService,
    ConnectorUploadEvaluationService,
    ConnectorUploadMatchResultsService,
    ConnectorUploadReplacePostAcceptService,
    ConnectorUploadReplaceMovementService,
    ConnectorUploadReplaceQueueProcessor,

    MicrosoftMeetingBookingService,

    CalendarService,
  ],
})
export class WorkerModule {}
