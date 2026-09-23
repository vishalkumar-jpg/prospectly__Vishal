import { Logger } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import type {
  RejectedCandidateLifecycleJobData,
  RejectedPartnerLifecycleJobData,
} from "../recruitment-lifecycle-notifications.constants";
import type { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import { formatUserFirstName } from "./recruitment-lifecycle-format.util";
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
  buildJobMarketplaceUrl,
  buildConnectorPipelineUrl,
} from "../recruitment-notification-urls.util";
import { RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES } from "../recruitment-lifecycle-notifications.constants";

export async function processRejectLifecycleNotification(
  db: PostgresJsDatabase<typeof schema>,
  emailsService: EmailsService,
  emailLogsService: RecruitmentEmailLogsService,
  logger: Logger,
  data: RejectedCandidateLifecycleJobData | RejectedPartnerLifecycleJobData
): Promise<void> {
  const { candidateId, rejectionCategory, rejectionNote } = data;
  if (!candidateId) {
    throw new Error("RECRUITMENT_LIFECYCLE :: reject :: missing candidateId");
  }

  const ctx = await loadCandidateJobContext(db, candidateId);
  if (!ctx) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: reject :: candidate ${candidateId} not found`
    );
    return;
  }

  const note = rejectionNote?.trim() ?? "";

  if (
    data.type === RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.REJECTED_CANDIDATE
  ) {
    const email = await resolveUserEmail(db, ctx.candidateUserId);
    if (!email) {
      logger.warn(
        `RECRUITMENT_LIFECYCLE :: reject_candidate :: no email for candidate ${candidateId}`
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
      Slug.RecruitmentCandidateRejected,
      email,
      escapeVars({
        candidateName: formatUserFirstName(candidateUser ?? {}),
        jobTitle: ctx.jobTitle,
        companyName: ctx.companyName,
        rejectionCategory,
        rejectionNote: note,
        jobMarketplaceUrl: buildJobMarketplaceUrl(),
        applicationsUrl: buildCandidateApplicationsUrl(),
      }),
      `reject_candidate candidate=${candidateId}`,
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

  const { recipientId } = data;
  if (!recipientId) return;

  // Drop legacy collaborator REJECTED_PARTNER jobs still queued after rollout.
  const [connectorLink] = await db
    .select({ id: schema.recruitmentCandidateConnectors.id })
    .from(schema.recruitmentCandidateConnectors)
    .where(
      and(
        eq(schema.recruitmentCandidateConnectors.candidateId, candidateId),
        eq(schema.recruitmentCandidateConnectors.connectorUserId, recipientId),
        isNull(schema.recruitmentCandidateConnectors.deletedAt)
      )
    )
    .limit(1);

  if (!connectorLink) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: reject_partner :: skip non-connector recipient=${recipientId} candidate=${candidateId}`
    );
    return;
  }

  const recipientEmail = await resolveUserEmail(db, recipientId);
  if (!recipientEmail) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: reject_partner :: recipient ${recipientId} unreachable`
    );
    return;
  }

  const [recipient] = await db
    .select({
      fullName: schema.users.fullName,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      email: schema.users.email,
    })
    .from(schema.users)
    .where(eq(schema.users.id, recipientId))
    .limit(1);

  const candidateName = await resolveConnectorCandidateName(
    db,
    ctx.contactId,
    ctx.candidateUserId
  );

  await sendLifecycleEmail(
    emailsService,
    logger,
    Slug.RecruitmentConnectorRejected,
    recipientEmail,
    escapeVars({
      recipientName: formatUserFirstName(recipient ?? {}),
      candidateName,
      jobTitle: ctx.jobTitle,
      companyName: ctx.companyName,
      rejectionCategory,
      rejectionNote: note,
      actionUrl: buildConnectorPipelineUrl(candidateId),
      jobMarketplaceUrl: buildJobMarketplaceUrl(),
    }),
    `reject_partner candidate=${candidateId} recipient=${recipientId}`,
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
