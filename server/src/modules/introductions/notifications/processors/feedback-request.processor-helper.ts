import { Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import { IntroductionStatus } from "modules/introductions/introductions.constants";
import {
  formatUserFirstName,
  formatProspectFirstName,
  renderLifecycleEmail,
} from "./introduction-notification-render.helper";
import { sendEmailsInBatches } from "./introduction-notification-send.helper";
import { loadActiveUserRow } from "./introduction-notification-user.helper";
import { INTRODUCTION_NOTIFICATION_TYPE } from "../introduction-notifications.constants";
import { buildFeedbackUrl } from "../introduction-notification-urls.util";

export async function processFeedbackRequest(
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

  if (!request) return;

  if (request.status !== IntroductionStatus.PEER_FEEDBACK) {
    logger.warn(
      `INTRO_NOTIFICATION :: feedback_request :: skip status ${request.status} for ${requestId}`
    );
    return;
  }

  if (request.requesterArchived) {
    logger.log(
      `INTRO_NOTIFICATION :: feedback_request :: skip archived ${requestId}`
    );
    return;
  }

  if (!request.acceptedBy) {
    logger.log(
      `INTRO_NOTIFICATION :: feedback_request :: no connector ${requestId}`
    );
    return;
  }

  const meetingTitle = request.meetingTitle?.trim() || "Introduction meeting";

  const connectorRow = await loadActiveUserRow(db, request.acceptedBy);
  const requesterRow = request.requesterId
    ? await loadActiveUserRow(db, request.requesterId)
    : null;

  if (!connectorRow?.email) {
    logger.log(
      `INTRO_NOTIFICATION :: feedback_request :: no connector email ${requestId}`
    );
    return;
  }

  const connectorName = formatUserFirstName(connectorRow);
  const requesterName = requesterRow
    ? formatUserFirstName(requesterRow)
    : "the requester";

  const { subject, html } = await renderLifecycleEmail(
    emailsService,
    Slug.IntroductionFeedbackRequest,
    {
      recipientName: connectorName,
      otherPartyName: requesterName,
      prospectName: formatProspectFirstName(request.contactName),
      meetingTitle,
      role: "connector",
      feedbackUrl: buildFeedbackUrl(requestId, "connector"),
    }
  );

  await sendEmailsInBatches(
    emailsService,
    logger,
    [
      {
        to: connectorRow.email,
        subject,
        html,
        slug: Slug.IntroductionFeedbackRequest,
      },
    ],
    `${INTRODUCTION_NOTIFICATION_TYPE.FEEDBACK_REQUEST}:${requestId}`
  );
}
