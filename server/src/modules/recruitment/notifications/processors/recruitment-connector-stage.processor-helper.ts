import { Logger } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import { RecruitmentFeeConfigService } from "modules/recruitment/fee-config/recruitment-fee-config.service";
import type { ConnectorStageProgressLifecycleJobData } from "../recruitment-lifecycle-notifications.constants";
import type { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import {
  formatRecruitmentUsd,
  formatUserDisplayName,
} from "./recruitment-lifecycle-format.util";
import {
  escapeVars,
  buildLifecycleLogContext,
  loadCandidateJobContext,
  resolveConnectorCandidateName,
  resolveUserEmail,
  sendLifecycleEmail,
} from "./recruitment-lifecycle-send.helper";
import { RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES } from "../recruitment-lifecycle-notifications.constants";
import {
  buildConnectorPipelineUrl,
  buildStripeSetupUrl,
} from "../recruitment-notification-urls.util";

const STAGE_SLUG: Record<ConnectorStageProgressLifecycleJobData["type"], Slug> =
  {
    [RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.INTERVIEW_INVITE_SENT_CONNECTOR]:
      Slug.RecruitmentConnectorInterviewInviteSent,
    [RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.INTERVIEW_SCHEDULED_CONNECTOR]:
      Slug.RecruitmentConnectorInterviewScheduled,
    [RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.INTERVIEW_COMPLETED_CONNECTOR]:
      Slug.RecruitmentConnectorInterviewCompleted,
  };

export async function processConnectorStageProgressLifecycleNotification(
  db: PostgresJsDatabase<typeof schema>,
  emailsService: EmailsService,
  feeConfig: RecruitmentFeeConfigService,
  emailLogsService: RecruitmentEmailLogsService,
  logger: Logger,
  data: ConnectorStageProgressLifecycleJobData
): Promise<void> {
  const { candidateId, recipientId: connectorUserId, type } = data;
  if (!candidateId || !connectorUserId) {
    throw new Error(
      "RECRUITMENT_LIFECYCLE :: connector_stage :: missing candidateId/recipientId"
    );
  }

  const ctx = await loadCandidateJobContext(db, candidateId);
  if (!ctx) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: connector_stage :: candidate ${candidateId} not found`
    );
    return;
  }

  const connectorEmail = await resolveUserEmail(db, connectorUserId);
  if (!connectorEmail) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: connector_stage :: connector ${connectorUserId} unreachable`
    );
    return;
  }

  const [connector] = await db
    .select({
      fullName: schema.users.fullName,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      email: schema.users.email,
    })
    .from(schema.users)
    .where(eq(schema.users.id, connectorUserId))
    .limit(1);

  const [shareRow] = await db
    .select({
      sharePercent: schema.recruitmentCandidateConnectors.sharePercent,
    })
    .from(schema.recruitmentCandidateConnectors)
    .where(
      and(
        eq(schema.recruitmentCandidateConnectors.candidateId, candidateId),
        eq(
          schema.recruitmentCandidateConnectors.connectorUserId,
          connectorUserId
        ),
        isNull(schema.recruitmentCandidateConnectors.deletedAt)
      )
    )
    .limit(1);

  if (!shareRow) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: connector_stage :: no connector record for connector ${connectorUserId} on candidate ${candidateId}`
    );
    return;
  }

  const gross = ctx.bountyAmount ? parseFloat(ctx.bountyAmount) : 0;
  const payoutAmount = gross
    ? formatRecruitmentUsd(
        feeConfig.getConnectorPayoutAmount(gross, Number(shareRow.sharePercent))
      )
    : "";

  const candidateName = await resolveConnectorCandidateName(
    db,
    ctx.contactId,
    ctx.candidateUserId
  );

  await sendLifecycleEmail(
    emailsService,
    logger,
    STAGE_SLUG[type],
    connectorEmail,
    escapeVars({
      connectorName: formatUserDisplayName(connector ?? {}),
      candidateName,
      jobTitle: ctx.jobTitle,
      companyName: ctx.companyName,
      payoutAmount,
      pipelineUrl: buildConnectorPipelineUrl(candidateId),
      stripeSetupUrl: buildStripeSetupUrl(),
    }),
    `connector_stage type=${type} candidate=${candidateId} connector=${connectorUserId}`,
    {
      log: buildLifecycleLogContext(
        emailLogsService,
        ctx,
        candidateId,
        data.sentByUserId
      ),
    }
  );
}
