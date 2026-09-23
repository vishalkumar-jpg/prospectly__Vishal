import { Logger } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import { escapeHtml } from "modules/emails/templating";
import { FAILURE_REASONS } from "modules/introductions/refunds/refunds.constants";
import { hasRemainingPrivateConnectors } from "modules/introductions/workflow/unfulfillment.helpers";
import {
  formatLifecycleDate,
  formatProspectName,
  formatUserDisplayName,
  renderLifecycleEmail,
} from "./introduction-notification-render.helper";
import { sendEmailsInBatches } from "./introduction-notification-send.helper";
import { INTRODUCTION_NOTIFICATION_TYPE } from "../introduction-notifications.constants";
import { buildRequesterPipelineUrl } from "../introduction-notification-urls.util";

const FAILURE_REASON_LABELS: Record<string, string> = {
  [FAILURE_REASONS.NO_RESPONSE]: "No response from prospect",
  [FAILURE_REASONS.PROSPECT_DECLINED]: "Prospect declined",
  [FAILURE_REASONS.SCHEDULING_ISSUES]: "Scheduling issues",
  [FAILURE_REASONS.NO_SHOW]: "No show at meeting",
  [FAILURE_REASONS.INVALID_EMAIL]: "Invalid email address",
  [FAILURE_REASONS.OTHER]: "Other",
};

function formatFailureReasonLabel(code: string): string {
  return FAILURE_REASON_LABELS[code] || code;
}

function buildUnsuccessfulEmailContent(input: {
  requesterName: string;
  connectorName: string;
  prospectName: string;
  canRepublish: boolean;
  requestId: string;
}): {
  emailHeadline: string;
  nextStepBody: string;
  ctaUrl: string;
  ctaLabel: string;
} {
  const {
    requesterName,
    connectorName,
    prospectName,
    canRepublish,
    requestId,
  } = input;

  if (canRepublish) {
    return {
      emailHeadline: `Hi ${requesterName}, your introduction request needs a new connector`,
      nextStepBody: `Any applicable refund has been initiated. To find a new connector, re-publish your request. <strong style="color:#0F172A;">${connectorName}</strong> will not be able to see or accept this request again. Other eligible connectors who know <strong style="color:#0F172A;">${prospectName}</strong> will be notified once you confirm.`,
      ctaUrl: buildRequesterPipelineUrl(requestId, "republish"),
      ctaLabel: "Re-publish request \u2192",
    };
  }

  return {
    emailHeadline: `Hi ${requesterName}, move your request to the global marketplace`,
    nextStepBody:
      "Any applicable refund has been initiated. All private connectors have marked this request unsuccessful, so re-publish is not available. You can still move it to the global marketplace to reach new connectors.",
    ctaUrl: buildRequesterPipelineUrl(requestId, "marketplace"),
    ctaLabel: "Move to marketplace \u2192",
  };
}

export async function processRequesterRequestUnsuccessful(
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

  if (!request?.requesterId || request.requesterArchived) return;

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
    return;
  }

  const [latestAttempt] = await db
    .select()
    .from(schema.introductionFulfillmentAttempts)
    .where(
      eq(
        schema.introductionFulfillmentAttempts.introductionRequestId,
        requestId
      )
    )
    .orderBy(desc(schema.introductionFulfillmentAttempts.createdAt))
    .limit(1);

  if (!latestAttempt) return;

  const [connector] = await db
    .select({
      fullName: schema.users.fullName,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      email: schema.users.email,
    })
    .from(schema.users)
    .where(eq(schema.users.id, latestAttempt.connectorId))
    .limit(1);

  const connectorName = connector
    ? formatUserDisplayName(connector)
    : "Your connector";
  const requesterName = formatUserDisplayName(requester);
  const prospectName = formatProspectName(request.contactName);
  const meetingTitle = request.meetingTitle?.trim() || "Introduction meeting";
  const canRepublish = await hasRemainingPrivateConnectors(db, requestId);
  const safeRequesterName = escapeHtml(requesterName);
  const safeConnectorName = escapeHtml(connectorName);
  const safeProspectName = escapeHtml(prospectName);
  const safeMeetingTitle = escapeHtml(meetingTitle);
  const safeFailureNotes = escapeHtml(
    latestAttempt.failureNotes?.trim() || "No additional notes"
  );
  const emailContent = buildUnsuccessfulEmailContent({
    requesterName: safeRequesterName,
    connectorName: safeConnectorName,
    prospectName: safeProspectName,
    canRepublish,
    requestId,
  });

  const { subject, html } = await renderLifecycleEmail(
    emailsService,
    Slug.IntroductionRequestUnsuccessful,
    {
      requesterName: safeRequesterName,
      meetingTitle: safeMeetingTitle,
      prospectName: safeProspectName,
      connectorName: safeConnectorName,
      failureReason: formatFailureReasonLabel(latestAttempt.failureReason),
      failureNotes: safeFailureNotes,
      unsuccessfulDate: formatLifecycleDate(latestAttempt.createdAt),
      ...emailContent,
      url: emailContent.ctaUrl,
    }
  );

  await sendEmailsInBatches(
    emailsService,
    logger,
    [
      {
        to: requester.email.trim(),
        subject,
        html,
        slug: Slug.IntroductionRequestUnsuccessful,
      },
    ],
    INTRODUCTION_NOTIFICATION_TYPE.REQUESTER_REQUEST_UNSUCCESSFUL
  );
}
