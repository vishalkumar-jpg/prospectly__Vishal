import { Logger } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import {
  computeConnectorWaitWindow,
  computeProbation,
} from "modules/recruitment/payout/services/recruitment-payout-gating.helper";
import { RECRUITMENT_PAYOUT_TYPE } from "modules/recruitment/payout/recruitment-payout.constants";
import type {
  HiredCandidateLifecycleJobData,
  HiredConnectorLifecycleJobData,
} from "../recruitment-lifecycle-notifications.constants";
import type { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import {
  formatLifecycleDate,
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

async function loadConnectorPayoutAmount(
  db: PostgresJsDatabase<typeof schema>,
  candidateId: string,
  connectorUserId: string
): Promise<string> {
  const [row] = await db
    .select({
      recipientAmount: schema.recruitmentPayoutHistory.recipientAmount,
    })
    .from(schema.recruitmentPayoutHistory)
    .where(
      and(
        eq(schema.recruitmentPayoutHistory.candidateId, candidateId),
        eq(schema.recruitmentPayoutHistory.recipientId, connectorUserId),
        eq(
          schema.recruitmentPayoutHistory.payoutType,
          RECRUITMENT_PAYOUT_TYPE.CONNECTOR
        ),
        isNull(schema.recruitmentPayoutHistory.deletedAt)
      )
    )
    .limit(1);

  return formatRecruitmentUsd(row?.recipientAmount);
}

export async function processHireLifecycleNotification(
  db: PostgresJsDatabase<typeof schema>,
  emailsService: EmailsService,
  emailLogsService: RecruitmentEmailLogsService,
  logger: Logger,
  data: HiredCandidateLifecycleJobData | HiredConnectorLifecycleJobData
): Promise<void> {
  const { candidateId } = data;
  if (!candidateId) {
    throw new Error("RECRUITMENT_LIFECYCLE :: hire :: missing candidateId");
  }

  const ctx = await loadCandidateJobContext(db, candidateId);
  if (!ctx) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: hire :: candidate ${candidateId} not found`
    );
    return;
  }

  const { hireDate } = ctx;
  const hireDateFormatted = formatLifecycleDate(hireDate);

  if (data.type === RECRUITMENT_LIFECYCLE_NOTIFICATION_TYPES.HIRED_CANDIDATE) {
    const email = await resolveUserEmail(db, ctx.candidateUserId);
    if (!email) {
      logger.warn(
        `RECRUITMENT_LIFECYCLE :: hire_candidate :: no email for candidate ${candidateId}`
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

    const probation = computeProbation({
      hireDate,
      probationPeriodDays: ctx.probationPeriodDays,
    });

    const hasProbationPeriod = Boolean(
      ctx.probationPeriodDays &&
      ctx.probationPeriodDays > 0 &&
      probation.probationEndsAt
    );
    const successBonusEligibilityText = hasProbationPeriod
      ? `This bonus becomes eligible once you complete your ${ctx.probationPeriodDays}-day probation period — that's ${formatLifecycleDate(probation.probationEndsAt)}. The recruiter releases it manually after probation is complete.`
      : "This bonus becomes eligible once you are officially hired. The recruiter releases it manually after hire.";

    await sendLifecycleEmail(
      emailsService,
      logger,
      Slug.RecruitmentCandidateHired,
      email,
      escapeVars({
        candidateName: formatUserFirstName(candidateUser ?? {}),
        jobTitle: ctx.jobTitle,
        companyName: ctx.companyName,
        hireDate: hireDateFormatted,
        hasSuccessFee: Boolean(ctx.hasSuccessFee && ctx.successFeeAmount),
        successFeeAmount: formatRecruitmentUsd(ctx.successFeeAmount),
        successBonusEligibilityText,
        applicationsUrl: buildCandidateApplicationsUrl(),
        stripeSetupUrl: buildStripeSetupUrl(),
      }),
      `hire_candidate candidate=${candidateId}`,
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
  if (!connectorUserId) {
    throw new Error(
      "RECRUITMENT_LIFECYCLE :: hire_connector :: missing recipientId"
    );
  }

  // Verify the connector is actually associated with this candidate before
  // sending any email, so stale or mismatched payloads cannot target the
  // wrong user.
  const [connectorLink] = await db
    .select({
      candidateId: schema.recruitmentCandidateConnectors.candidateId,
      classificationType:
        schema.recruitmentCandidateConnectors.classificationType,
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

  if (!connectorLink) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: hire_connector :: connector ${connectorUserId} is not associated with candidate ${candidateId} — skipping`
    );
    return;
  }

  const connectorEmail = await resolveUserEmail(db, connectorUserId);
  if (!connectorEmail) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: hire_connector :: connector ${connectorUserId} unreachable`
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

  const classificationType =
    connectorLink.classificationType === "internal" ||
    connectorLink.classificationType === "external"
      ? connectorLink.classificationType
      : null;
  const waitWindow = computeConnectorWaitWindow(
    { classificationType },
    {
      hireDate,
      intConnectorPayoutWaitDays: ctx.intConnectorPayoutWaitDays,
      extConnectorPayoutWaitDays: ctx.extConnectorPayoutWaitDays,
    }
  );

  const candidateName = await resolveConnectorCandidateName(
    db,
    ctx.contactId,
    ctx.candidateUserId
  );

  await sendLifecycleEmail(
    emailsService,
    logger,
    Slug.RecruitmentConnectorHired,
    connectorEmail,
    escapeVars({
      connectorName: formatUserDisplayName(connector ?? {}),
      candidateName,
      jobTitle: ctx.jobTitle,
      companyName: ctx.companyName,
      hireDate: hireDateFormatted,
      payoutAmount: await loadConnectorPayoutAmount(
        db,
        candidateId,
        connectorUserId
      ),
      connectorPayoutWaitDays: waitWindow.waitDays ?? "",
      connectorWaitEndsAt: formatLifecycleDate(waitWindow.connectorWaitEndsAt),
      pipelineUrl: buildConnectorPipelineUrl(candidateId),
      stripeSetupUrl: buildStripeSetupUrl(),
    }),
    `hire_connector candidate=${candidateId} connector=${connectorUserId}`,
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
