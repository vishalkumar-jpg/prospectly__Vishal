import { Logger } from "@nestjs/common";
import { and, eq, isNull, ne } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import { IntroductionStatus } from "modules/introductions/introductions.constants";
import {
  formatBountyAmount,
  formatProspectFirstName,
  formatProspectName,
  formatUserDisplayName,
  renderLifecycleEmail,
} from "./introduction-notification-render.helper";
import { sendEmailsInBatches } from "./introduction-notification-send.helper";
import {
  INTRODUCTION_NOTIFICATION_DB_PAGE_SIZE,
  INTRODUCTION_NOTIFICATION_TYPE,
} from "../introduction-notifications.constants";
import { buildConnectorInboxUrl } from "../introduction-notification-urls.util";

export async function processConnectorRequestRaised(
  db: PostgresJsDatabase<typeof schema>,
  emailsService: EmailsService,
  logger: Logger,
  requestId: string
): Promise<void> {
  const [request] = await db
    .select()
    .from(schema.introductionRequests)
    .where(eq(schema.introductionRequests.id, requestId))
    .limit(1);

  if (
    !request ||
    !request.requesterId ||
    request.status !== IntroductionStatus.PENDING
  ) {
    logger.warn(
      `INTRO_NOTIFICATION :: connector_request_raised :: skip request ${requestId}`
    );
    return;
  }

  const [requester] = await db
    .select({
      fullName: schema.users.fullName,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      email: schema.users.email,
    })
    .from(schema.users)
    .where(eq(schema.users.id, request.requesterId!))
    .limit(1);

  const requesterName = requester
    ? formatUserDisplayName(requester)
    : "A requester";
  const prospectName = formatProspectName(request.contactName);
  const bountyAmount = formatBountyAmount(request.bountyAmount);
  const message = request.meetingDescription?.trim() || "";
  const inboxUrl = buildConnectorInboxUrl(requestId, "review");

  const templateVars = {
    requesterName,
    prospectName,
    prospectFirstName: formatProspectFirstName(request.contactName),
    contactName: prospectName,
    bountyAmount,
    message,
    inboxUrl,
  };

  const { subject, html: sharedHtml } = await renderLifecycleEmail(
    emailsService,
    Slug.IntroductionRequest,
    templateVars
  );

  let offset = 0;
  let total = 0;

  for (;;) {
    const connectors = await db
      .select({
        email: schema.users.email,
      })
      .from(schema.introductionPotentialConnectors)
      .innerJoin(
        schema.users,
        eq(
          schema.users.id,
          schema.introductionPotentialConnectors.potentialConnectorId
        )
      )
      .where(
        and(
          eq(schema.introductionPotentialConnectors.requestId, requestId),
          eq(
            schema.introductionPotentialConnectors.status,
            IntroductionStatus.PENDING
          ),
          isNull(schema.users.deletedAt),
          eq(schema.users.isActive, true),
          ne(
            schema.introductionPotentialConnectors.potentialConnectorId,
            request.requesterId
          )
        )
      )
      .orderBy(schema.introductionPotentialConnectors.potentialConnectorId)
      .limit(INTRODUCTION_NOTIFICATION_DB_PAGE_SIZE)
      .offset(offset);

    if (connectors.length === 0) break;

    const emails = connectors
      .map((c) => c.email?.trim())
      .filter((email): email is string => Boolean(email))
      .map((to) => ({
        to,
        subject,
        html: sharedHtml,
        slug: Slug.IntroductionRequest,
      }));

    await sendEmailsInBatches(
      emailsService,
      logger,
      emails,
      `${INTRODUCTION_NOTIFICATION_TYPE.CONNECTOR_REQUEST_RAISED}:${requestId}`
    );
    total += emails.length;

    if (connectors.length < INTRODUCTION_NOTIFICATION_DB_PAGE_SIZE) break;
    offset += INTRODUCTION_NOTIFICATION_DB_PAGE_SIZE;
  }

  if (total === 0) {
    logger.log(
      `INTRO_NOTIFICATION :: connector_request_raised :: no recipients for ${requestId}`
    );
  }
}
