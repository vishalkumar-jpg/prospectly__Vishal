import { Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import { IntroductionStatus } from "modules/introductions/introductions.constants";
import {
  formatLifecycleDate,
  formatUserDisplayName,
  formatProspectName,
  renderLifecycleEmail,
} from "./introduction-notification-render.helper";
import { sendEmailsInBatches } from "./introduction-notification-send.helper";
import {
  INTRODUCTION_NOTIFICATION_TYPE,
  IntroductionNotificationType,
} from "../introduction-notifications.constants";
import { buildRequesterPipelineUrl } from "../introduction-notification-urls.util";

export async function processRequesterConnectorAccepted(
  db: PostgresJsDatabase<typeof schema>,
  emailsService: EmailsService,
  logger: Logger,
  requestId: string
): Promise<void> {
  const ctx = await loadRequesterNotificationContext(db, requestId);
  if (!ctx || ctx.request.status !== IntroductionStatus.ACCEPTED) return;

  const connectorName = ctx.connector
    ? formatUserDisplayName(ctx.connector)
    : "Your connector";

  const { subject, html } = await renderLifecycleEmail(
    emailsService,
    Slug.IntroductionRequestAccepted,
    {
      requesterName: ctx.requesterName,
      connectorName,
      prospectName: formatProspectName(ctx.request.contactName),
      acceptedDate: formatLifecycleDate(ctx.request.acceptedAt),
      pipelineUrl: buildRequesterPipelineUrl(requestId),
    }
  );

  await sendEmailsInBatches(
    emailsService,
    logger,
    [
      {
        to: ctx.requester.email,
        subject,
        html,
        slug: Slug.IntroductionRequestAccepted,
      },
    ],
    INTRODUCTION_NOTIFICATION_TYPE.REQUESTER_CONNECTOR_ACCEPTED
  );
}

export async function processRequesterIntroSent(
  db: PostgresJsDatabase<typeof schema>,
  emailsService: EmailsService,
  logger: Logger,
  requestId: string
): Promise<void> {
  const ctx = await loadRequesterNotificationContext(db, requestId);
  if (!ctx || ctx.request.status !== IntroductionStatus.INTRO_SENT) return;

  const connectorName = ctx.connector
    ? formatUserDisplayName(ctx.connector)
    : "Your connector";

  const { subject, html } = await renderLifecycleEmail(
    emailsService,
    Slug.IntroductionSentRequester,
    {
      requesterName: ctx.requesterName,
      connectorName,
      prospectName: formatProspectName(ctx.request.contactName),
      sentDate: formatLifecycleDate(ctx.request.updatedAt),
      pipelineUrl: buildRequesterPipelineUrl(requestId),
    }
  );

  await sendEmailsInBatches(
    emailsService,
    logger,
    [
      {
        to: ctx.requester.email,
        subject,
        html,
        slug: Slug.IntroductionSentRequester,
      },
    ],
    INTRODUCTION_NOTIFICATION_TYPE.REQUESTER_INTRO_SENT
  );
}

async function loadRequesterNotificationContext(
  db: PostgresJsDatabase<typeof schema>,
  requestId: string
) {
  const [request] = await db
    .select()
    .from(schema.introductionRequests)
    .where(eq(schema.introductionRequests.id, requestId))
    .limit(1);

  if (!request?.requesterId) return null;

  const [requester] = await db
    .select({
      email: schema.users.email,
      fullName: schema.users.fullName,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      isActive: schema.users.isActive,
      deletedAt: schema.users.deletedAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, request.requesterId))
    .limit(1);

  if (!requester?.email?.trim() || requester.deletedAt || !requester.isActive) {
    return null;
  }

  const requesterName = formatUserDisplayName(requester);

  const connector = request.acceptedBy
    ? await db
        .select({
          fullName: schema.users.fullName,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
        })
        .from(schema.users)
        .where(eq(schema.users.id, request.acceptedBy))
        .limit(1)
        .then((rows) => rows[0])
    : undefined;

  return {
    request,
    requester: { email: requester.email.trim() },
    requesterName,
    connector,
  };
}

export async function processSingleRecipientByType(
  db: PostgresJsDatabase<typeof schema>,
  emailsService: EmailsService,
  logger: Logger,
  requestId: string,
  type: IntroductionNotificationType
): Promise<void> {
  if (type === INTRODUCTION_NOTIFICATION_TYPE.REQUESTER_CONNECTOR_ACCEPTED) {
    await processRequesterConnectorAccepted(
      db,
      emailsService,
      logger,
      requestId
    );
    return;
  }
  if (type === INTRODUCTION_NOTIFICATION_TYPE.REQUESTER_INTRO_SENT) {
    await processRequesterIntroSent(db, emailsService, logger, requestId);
  }
}
