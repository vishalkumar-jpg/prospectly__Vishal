import { Logger } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import type { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import type { JobClosedNotificationJobData } from "../../jobs/job-close-notification.constants";
import { sendJobLifecycleCandidateNotifications } from "./job-lifecycle-candidate-notifications.util";
import { sendJobLifecycleConnectorNotifications } from "./job-lifecycle-connector-notifications.util";
import { loadJobConnectorNotificationContext } from "../job-connector-notification.util";

export async function processJobClosedNotification(
  db: PostgresJsDatabase<typeof schema>,
  emailsService: EmailsService,
  emailLogsService: RecruitmentEmailLogsService,
  logger: Logger,
  data: JobClosedNotificationJobData
): Promise<void> {
  const ctx = await loadJobConnectorNotificationContext(db, data.jobId);
  if (!ctx) {
    logger.warn(
      `JOB_CLOSED_NOTIFICATION :: job ${data.jobId} not found; skipping`
    );
    return;
  }

  await sendJobLifecycleConnectorNotifications(
    db,
    emailsService,
    emailLogsService,
    logger,
    ctx,
    data.closedByUserId,
    Slug.RecruitmentJobClosedConnector,
    "JOB_CLOSED_NOTIFICATION"
  );

  await sendJobLifecycleCandidateNotifications(
    db,
    emailsService,
    emailLogsService,
    logger,
    ctx,
    data.closedByUserId,
    data.candidateStageKeys,
    Slug.RecruitmentJobClosedCandidate,
    "JOB_CLOSED_NOTIFICATION"
  );
}
