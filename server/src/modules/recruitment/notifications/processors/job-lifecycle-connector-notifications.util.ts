import { Logger } from "@nestjs/common";
import { inArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import type { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import { formatUserDisplayName } from "./recruitment-lifecycle-format.util";
import {
  isLifecycleRecipientEligible,
  sendLifecycleEmail,
} from "./recruitment-lifecycle-send.helper";
import { resolveJobConnectorUserIds } from "../job-connector-notification.util";
import {
  buildConnectorPipelineUrl,
  buildJobMarketplaceUrl,
} from "../recruitment-notification-urls.util";

type JobContext = {
  jobId: string;
  jobTitle: string;
  companyName: string;
};

type ConnectorLifecycleSlug =
  | Slug.RecruitmentJobClosedConnector
  | Slug.RecruitmentJobReopenedConnector;

export async function sendJobLifecycleConnectorNotifications(
  db: PostgresJsDatabase<typeof schema>,
  emailsService: EmailsService,
  emailLogsService: RecruitmentEmailLogsService,
  logger: Logger,
  ctx: JobContext,
  actorUserId: string,
  slug: ConnectorLifecycleSlug,
  logPrefix: string
): Promise<void> {
  const baseVars = {
    jobTitle: ctx.jobTitle,
    companyName: ctx.companyName,
  };

  const connectorIds = await resolveJobConnectorUserIds(db, ctx.jobId);
  if (!connectorIds.length) return;

  const recipients = await db
    .select({
      email: schema.users.email,
      fullName: schema.users.fullName,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      isActive: schema.users.isActive,
      deletedAt: schema.users.deletedAt,
    })
    .from(schema.users)
    .where(inArray(schema.users.id, connectorIds));

  for (const user of recipients) {
    try {
      const email = isLifecycleRecipientEligible(user);
      if (!email) continue;

      await sendLifecycleEmail(
        emailsService,
        logger,
        slug,
        email,
        {
          recipientName: formatUserDisplayName(user),
          ...baseVars,
          connectorPipelineUrl: buildConnectorPipelineUrl(),
          jobMarketplaceUrl: buildJobMarketplaceUrl(),
        },
        `${logPrefix} :: SEND_CONNECTOR`,
        {
          log: {
            emailLogsService,
            jobId: ctx.jobId,
            candidateId: null,
            poolMatchId: null,
            createdBy: actorUserId,
          },
        }
      );
    } catch {
      // sendLifecycleEmail already logged the failure; continue with next connector
    }
  }
}
