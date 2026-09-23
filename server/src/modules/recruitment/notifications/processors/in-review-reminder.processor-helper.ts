import { Logger } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import { RECRUITMENT_EMAIL_LOG_TYPE } from "modules/recruitment/email-logs/recruitment-email-logs.constants";
import type { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import {
  formatUserDisplayName,
  formatUserFirstName,
} from "./recruitment-lifecycle-format.util";
import {
  buildLifecycleLogContext,
  escapeVars,
  loadCandidateJobContext,
  resolveConnectorCandidateName,
  resolveUserEmail,
  sendLifecycleEmail,
} from "./recruitment-lifecycle-send.helper";
import {
  buildCandidateApplicationsUrl,
  buildConnectorPipelineUrl,
} from "../recruitment-lifecycle-notification-urls.util";

/**
 * One-time In Review status emails to candidate + connector(s).
 * Logs use job owner as createdBy — visible to all recruiter-side job viewers.
 */
export async function sendInReviewReminderEmails(
  db: PostgresJsDatabase<typeof schema>,
  emailsService: EmailsService,
  emailLogsService: RecruitmentEmailLogsService,
  logger: Logger,
  candidateId: string
): Promise<void> {
  const ctx = await loadCandidateJobContext(db, candidateId);
  if (!ctx) {
    return;
  }

  const logContext = buildLifecycleLogContext(
    emailLogsService,
    ctx,
    candidateId,
    ctx.requesterId
  );

  const [existingCandidateLog] = await db
    .select({ id: schema.recruitmentEmailLogsSchema.id })
    .from(schema.recruitmentEmailLogsSchema)
    .where(
      and(
        eq(schema.recruitmentEmailLogsSchema.candidateId, candidateId),
        eq(
          schema.recruitmentEmailLogsSchema.emailType,
          RECRUITMENT_EMAIL_LOG_TYPE.CANDIDATE_IN_REVIEW_STATUS
        ),
        isNull(schema.recruitmentEmailLogsSchema.deletedAt)
      )
    )
    .limit(1);

  if (!existingCandidateLog) {
    const candidateEmail = await resolveUserEmail(db, ctx.candidateUserId);

    if (candidateEmail) {
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
        Slug.RecruitmentCandidateInReviewStatus,
        candidateEmail,
        escapeVars({
          candidateName: formatUserFirstName(candidateUser ?? {}),
          jobTitle: ctx.jobTitle,
          companyName: ctx.companyName,
          applicationsUrl: buildCandidateApplicationsUrl(),
        }),
        `in_review_status candidate=${candidateId}`,
        { log: logContext }
      );
    } else {
      logger.warn(
        `IN_REVIEW_REMINDER :: skipped candidate email — no address (candidate=${candidateId})`
      );
    }
  }

  const connectors = await db
    .select({
      connectorUserId: schema.recruitmentCandidateConnectors.connectorUserId,
    })
    .from(schema.recruitmentCandidateConnectors)
    .where(
      and(
        eq(schema.recruitmentCandidateConnectors.candidateId, candidateId),
        isNull(schema.recruitmentCandidateConnectors.deletedAt)
      )
    );

  const candidateName = await resolveConnectorCandidateName(
    db,
    ctx.contactId,
    ctx.candidateUserId
  );

  for (const { connectorUserId } of connectors) {
    const connectorEmail = await resolveUserEmail(db, connectorUserId);
    if (!connectorEmail) {
      continue;
    }

    const [existingConnectorLog] = await db
      .select({ id: schema.recruitmentEmailLogsSchema.id })
      .from(schema.recruitmentEmailLogsSchema)
      .where(
        and(
          eq(schema.recruitmentEmailLogsSchema.candidateId, candidateId),
          eq(
            schema.recruitmentEmailLogsSchema.emailType,
            RECRUITMENT_EMAIL_LOG_TYPE.CONNECTOR_IN_REVIEW_STATUS
          ),
          eq(schema.recruitmentEmailLogsSchema.recipientEmail, connectorEmail),
          isNull(schema.recruitmentEmailLogsSchema.deletedAt)
        )
      )
      .limit(1);

    if (existingConnectorLog) {
      continue;
    }

    const [connector] = await db
      .select({
        fullName: schema.users.fullName,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.users)
      .where(eq(schema.users.id, connectorUserId))
      .limit(1);

    await sendLifecycleEmail(
      emailsService,
      logger,
      Slug.RecruitmentConnectorInReviewStatus,
      connectorEmail,
      escapeVars({
        connectorName: formatUserDisplayName(connector ?? {}),
        candidateName,
        jobTitle: ctx.jobTitle,
        companyName: ctx.companyName,
        pipelineUrl: buildConnectorPipelineUrl(candidateId),
      }),
      `in_review_status connector=${connectorUserId} candidate=${candidateId}`,
      { log: logContext }
    );
  }
}
