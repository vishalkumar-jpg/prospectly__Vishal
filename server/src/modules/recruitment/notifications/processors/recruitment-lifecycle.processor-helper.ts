import { Logger } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { CreditUsageHelper } from "modules/credits/helpers/credit-usage.helper";
import { EmailsService } from "modules/emails/emails.service";
import { RecruitmentFeeConfigService } from "modules/recruitment/fee-config/recruitment-fee-config.service";
import type { RecruitmentLifecycleJobData } from "../recruitment-lifecycle-notifications.constants";
import type { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import { processHireLifecycleNotification } from "./recruitment-hire.processor-helper";
import { processRecruiterNewCandidateNotification } from "./recruitment-new-candidate.processor-helper";
import { processPayoutSetupLifecycleNotification } from "./recruitment-payout-setup.processor-helper";
import { processPayoutReleasedLifecycleNotification } from "./recruitment-payout-released.processor-helper";
import { processRejectLifecycleNotification } from "./recruitment-reject.processor-helper";
import { processShortlistLifecycleNotification } from "./recruitment-shortlist.processor-helper";
import { processConnectorStageProgressLifecycleNotification } from "./recruitment-connector-stage.processor-helper";
import { RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES } from "../recruitment-lifecycle-notifications.constants";

export async function processRecruitmentLifecycleNotification(
  db: PostgresJsDatabase<typeof schema>,
  emailsService: EmailsService,
  feeConfig: RecruitmentFeeConfigService,
  creditUsageHelper: CreditUsageHelper,
  emailLogsService: RecruitmentEmailLogsService,
  logger: Logger,
  data: RecruitmentLifecycleJobData
): Promise<void> {
  switch (data.type) {
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.RECRUITER_NEW_CANDIDATE:
      await processRecruiterNewCandidateNotification(
        db,
        emailsService,
        emailLogsService,
        logger,
        data
      );
      break;
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.SHORTLISTED_CANDIDATE:
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.SHORTLISTED_CONNECTOR:
      await processShortlistLifecycleNotification(
        db,
        emailsService,
        feeConfig,
        emailLogsService,
        logger,
        data
      );
      break;
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.INTERVIEW_INVITE_SENT_CONNECTOR:
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.INTERVIEW_SCHEDULED_CONNECTOR:
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.INTERVIEW_COMPLETED_CONNECTOR:
      await processConnectorStageProgressLifecycleNotification(
        db,
        emailsService,
        feeConfig,
        emailLogsService,
        logger,
        data
      );
      break;
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.HIRED_CANDIDATE:
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.HIRED_CONNECTOR:
      await processHireLifecycleNotification(
        db,
        emailsService,
        emailLogsService,
        logger,
        data
      );
      break;
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.REJECTED_CANDIDATE:
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.REJECTED_PARTNER:
      await processRejectLifecycleNotification(
        db,
        emailsService,
        emailLogsService,
        logger,
        data
      );
      break;
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.PAYOUT_SETUP:
      await processPayoutSetupLifecycleNotification(
        db,
        emailsService,
        emailLogsService,
        logger,
        data
      );
      break;
    case RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.PAYOUT_RELEASED:
      await processPayoutReleasedLifecycleNotification(
        db,
        emailsService,
        creditUsageHelper,
        emailLogsService,
        logger,
        data
      );
      break;
    default: {
      const unexpectedType = (data as { type: string }).type;
      throw new Error(`Unknown lifecycle notification type: ${unexpectedType}`);
    }
  }
}
