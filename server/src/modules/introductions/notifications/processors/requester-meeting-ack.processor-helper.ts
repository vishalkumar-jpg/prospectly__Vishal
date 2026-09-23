import { Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import { IntroductionStatus } from "modules/introductions/introductions.constants";
import {
  formatProspectName,
  formatUserDisplayName,
  formatUserFirstName,
  renderLifecycleEmail,
} from "./introduction-notification-render.helper";
import { sendEmailsInBatches } from "./introduction-notification-send.helper";
import { loadActiveUserRow } from "./introduction-notification-user.helper";
import { INTRODUCTION_NOTIFICATION_TYPE } from "../introduction-notifications.constants";
import { buildRequesterPipelineUrl } from "../introduction-notification-urls.util";

export async function processRequesterMeetingAck(
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

  if (request.status !== IntroductionStatus.MEETING_COMPLETED) {
    logger.warn(
      `INTRO_NOTIFICATION :: requester_meeting_ack :: skip status ${request.status} for ${requestId}`
    );
    return;
  }

  if (request.requesterArchived) {
    logger.log(
      `INTRO_NOTIFICATION :: requester_meeting_ack :: skip archived ${requestId}`
    );
    return;
  }

  if (request.meetingCompletedByRequester) {
    logger.log(
      `INTRO_NOTIFICATION :: requester_meeting_ack :: already acknowledged ${requestId}`
    );
    return;
  }

  if (!request.requesterId) return;

  const requesterRow = await loadActiveUserRow(db, request.requesterId);
  if (!requesterRow?.email) {
    logger.log(
      `INTRO_NOTIFICATION :: requester_meeting_ack :: no requester email ${requestId}`
    );
    return;
  }

  const connectorRow = request.acceptedBy
    ? await loadActiveUserRow(db, request.acceptedBy)
    : null;

  const requesterName = formatUserDisplayName(requesterRow);
  const connectorName = connectorRow
    ? formatUserDisplayName(connectorRow)
    : "your connector";
  const prospectName = formatProspectName(request.contactName);
  const meetingTitle = request.meetingTitle?.trim() || "Introduction meeting";

  const { subject, html } = await renderLifecycleEmail(
    emailsService,
    Slug.IntroductionMeetingAckRequester,
    {
      requesterName,
      requesterFirstName: formatUserFirstName(requesterRow),
      connectorName,
      prospectName,
      meetingTitle,
      pipelineUrl: buildRequesterPipelineUrl(requestId, "acknowledge"),
    }
  );

  await sendEmailsInBatches(
    emailsService,
    logger,
    [
      {
        to: requesterRow.email,
        subject,
        html,
        slug: Slug.IntroductionMeetingAckRequester,
      },
    ],
    `${INTRODUCTION_NOTIFICATION_TYPE.REQUESTER_MEETING_ACK}:${requestId}`
  );
}
