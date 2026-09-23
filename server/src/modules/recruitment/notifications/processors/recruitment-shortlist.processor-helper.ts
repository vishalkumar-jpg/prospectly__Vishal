import { Logger } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import { RecruitmentFeeConfigService } from "modules/recruitment/fee-config/recruitment-fee-config.service";
import type {
  ShortlistedCandidateLifecycleJobData,
  ShortlistedConnectorLifecycleJobData,
} from "../recruitment-lifecycle-notifications.constants";
import type { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import {
  formatRecruitmentUsd,
  formatUserDisplayName,
  formatUserFirstName,
} from "./recruitment-lifecycle-format.util";
import {
  escapeVars,
  buildLifecycleLogContext,
  loadCandidateJobContext,
  resolveConnectorCandidateName,
  resolveUserEmail,
  sendLifecycleEmail,
} from "./recruitment-lifecycle-send.helper";
import {
  buildCandidateApplicationsUrl,
  buildConnectorPipelineUrl,
  buildStripeSetupUrl,
} from "../recruitment-notification-urls.util";
import { RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES } from "../recruitment-lifecycle-notifications.constants";

async function loadConnectorShare(
  db: PostgresJsDatabase<typeof schema>,
  candidateId: string,
  connectorUserId: string
): Promise<number | null> {
  const [row] = await db
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

  return row ? Number(row.sharePercent) : null;
}

function connectorPayoutAmount(
  feeConfig: RecruitmentFeeConfigService,
  bountyAmount: string | null,
  sharePercent: number
): string {
  const gross = bountyAmount ? parseFloat(bountyAmount) : 0;
  if (!gross) return "";
  return formatRecruitmentUsd(
    feeConfig.getConnectorPayoutAmount(gross, sharePercent)
  );
}

export async function processShortlistLifecycleNotification(
  db: PostgresJsDatabase<typeof schema>,
  emailsService: EmailsService,
  feeConfig: RecruitmentFeeConfigService,
  emailLogsService: RecruitmentEmailLogsService,
  logger: Logger,
  data:
    | ShortlistedCandidateLifecycleJobData
    | ShortlistedConnectorLifecycleJobData
): Promise<void> {
  const { candidateId } = data;
  if (!candidateId) {
    throw new Error(
      "RECRUITMENT_LIFECYCLE :: shortlist :: missing candidateId"
    );
  }

  const ctx = await loadCandidateJobContext(db, candidateId);
  if (!ctx) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: shortlist :: candidate ${candidateId} not found`
    );
    return;
  }

  if (
    data.type === RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.SHORTLISTED_CANDIDATE
  ) {
    const email = await resolveUserEmail(db, ctx.candidateUserId);
    if (!email) {
      logger.warn(
        `RECRUITMENT_LIFECYCLE :: shortlist_candidate :: no email for candidate ${candidateId}`
      );
      return;
    }

    const [candidateUser] = await db
      .select({
        fullName: schema.users.fullName,
        firstName: schema.users.firstName,
      })
      .from(schema.users)
      .where(eq(schema.users.id, ctx.candidateUserId))
      .limit(1);

    await sendLifecycleEmail(
      emailsService,
      logger,
      Slug.RecruitmentCandidateShortlisted,
      email,
      escapeVars({
        candidateName: formatUserFirstName(candidateUser ?? {}),
        jobTitle: ctx.jobTitle,
        companyName: ctx.companyName,
        applicationsUrl: buildCandidateApplicationsUrl(),
      }),
      `shortlist_candidate candidate=${candidateId}`,
      {
        log: buildLifecycleLogContext(
          emailLogsService,
          ctx,
          candidateId,
          data.sentByUserId
        ),
      }
    );
    return;
  }

  const connectorUserId = data.recipientId;
  if (!connectorUserId) return;

  const connectorEmail = await resolveUserEmail(db, connectorUserId);
  if (!connectorEmail) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: shortlist_connector :: connector ${connectorUserId} unreachable`
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

  const sharePercent = await loadConnectorShare(
    db,
    candidateId,
    connectorUserId
  );
  if (sharePercent === null) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: shortlist_connector :: no connector record found for connector ${connectorUserId} on candidate ${candidateId} — skipping`
    );
    return;
  }

  const candidateName = await resolveConnectorCandidateName(
    db,
    ctx.contactId,
    ctx.candidateUserId
  );

  await sendLifecycleEmail(
    emailsService,
    logger,
    Slug.RecruitmentConnectorShortlisted,
    connectorEmail,
    escapeVars({
      connectorName: formatUserDisplayName(connector ?? {}),
      candidateName,
      jobTitle: ctx.jobTitle,
      companyName: ctx.companyName,
      payoutAmount: connectorPayoutAmount(
        feeConfig,
        ctx.bountyAmount,
        sharePercent
      ),
      pipelineUrl: buildConnectorPipelineUrl(candidateId),
      stripeSetupUrl: buildStripeSetupUrl(),
    }),
    `shortlist_connector candidate=${candidateId} connector=${connectorUserId}`,
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
