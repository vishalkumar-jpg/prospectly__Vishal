import { Logger } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { CreditUsageHelper } from "modules/credits/helpers/credit-usage.helper";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import { RECRUITMENT_PAYOUT_TYPE } from "modules/recruitment/payout/recruitment-payout.constants";
import type { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import type { PayoutReleasedLifecycleJobData } from "../recruitment-lifecycle-notifications.constants";
import {
  formatEstimatedPayoutCreditDate,
  formatLifecycleDate,
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
import { buildPayoutReleasedCreditEmailVars } from "./recruitment-payout-credit-breakdown.util";
import { buildStripeSetupUrl } from "../recruitment-notification-urls.util";

async function recipientHasBankAccount(
  db: PostgresJsDatabase<typeof schema>,
  recipientId: string
): Promise<boolean> {
  const [user] = await db
    .select({
      stripeRecipientAccountId: schema.users.stripeRecipientAccountId,
      stripeRecipientOnboardingComplete:
        schema.users.stripeRecipientOnboardingComplete,
    })
    .from(schema.users)
    .where(eq(schema.users.id, recipientId))
    .limit(1);

  return Boolean(
    user?.stripeRecipientAccountId && user?.stripeRecipientOnboardingComplete
  );
}

export async function processPayoutReleasedLifecycleNotification(
  db: PostgresJsDatabase<typeof schema>,
  emailsService: EmailsService,
  creditUsageHelper: CreditUsageHelper,
  emailLogsService: RecruitmentEmailLogsService,
  logger: Logger,
  data: PayoutReleasedLifecycleJobData
): Promise<void> {
  const { payoutId, recipientId, releasedAt } = data;
  if (!payoutId || !recipientId) return;

  const [payout] = await db
    .select({
      payoutType: schema.recruitmentPayoutHistory.payoutType,
      recipientAmount: schema.recruitmentPayoutHistory.recipientAmount,
      platformAmount: schema.recruitmentPayoutHistory.platformAmount,
      candidateId: schema.recruitmentPayoutHistory.candidateId,
      jobId: schema.recruitmentPayoutHistory.jobId,
      jobTitle: schema.recruitmentJobsSchema.title,
      companyName: schema.recruitmentJobsSchema.companyName,
      requesterId: schema.recruitmentJobsSchema.requesterId,
    })
    .from(schema.recruitmentPayoutHistory)
    .innerJoin(
      schema.recruitmentJobsSchema,
      eq(schema.recruitmentPayoutHistory.jobId, schema.recruitmentJobsSchema.id)
    )
    .where(
      and(
        eq(schema.recruitmentPayoutHistory.id, payoutId),
        eq(schema.recruitmentPayoutHistory.recipientId, recipientId),
        isNull(schema.recruitmentPayoutHistory.deletedAt)
      )
    )
    .limit(1);

  if (!payout?.candidateId) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: payout_released :: payout ${payoutId} not found`
    );
    return;
  }

  const ctx = await loadCandidateJobContext(db, payout.candidateId);
  if (!ctx) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: payout_released :: candidate ${payout.candidateId} not found`
    );
    return;
  }

  const hasBankAccount = await recipientHasBankAccount(db, recipientId);
  const creditBreakdown = await buildPayoutReleasedCreditEmailVars(
    creditUsageHelper,
    recipientId,
    payout.recipientAmount,
    payout.platformAmount
  );
  const releasedDate = formatLifecycleDate(releasedAt);
  const estimatedCreditDate = formatEstimatedPayoutCreditDate(releasedAt);
  const logContext = buildLifecycleLogContext(
    emailLogsService,
    { jobId: payout.jobId, requesterId: payout.requesterId },
    payout.candidateId,
    data.sentByUserId ?? payout.requesterId
  );

  if (payout.payoutType === RECRUITMENT_PAYOUT_TYPE.CANDIDATE) {
    const email = await resolveUserEmail(db, ctx.candidateUserId);
    if (!email) {
      logger.warn(
        `RECRUITMENT_LIFECYCLE :: payout_released :: candidate ${payout.candidateId} unreachable`
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
      Slug.RecruitmentCandidatePayoutReleased,
      email,
      escapeVars({
        recipientName: formatUserFirstName(candidateUser ?? {}),
        jobTitle: payout.jobTitle,
        companyName: payout.companyName,
        ...creditBreakdown,
        releasedDate,
        estimatedCreditDate,
        needsBankSetup: !hasBankAccount,
        stripeSetupUrl: buildStripeSetupUrl(),
      }),
      `payout_released candidate payout=${payoutId}`,
      { log: logContext }
    );
    return;
  }

  if (payout.payoutType !== RECRUITMENT_PAYOUT_TYPE.CONNECTOR) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: payout_released :: unsupported type "${payout.payoutType}"`
    );
    return;
  }

  const connectorEmail = await resolveUserEmail(db, recipientId);
  if (!connectorEmail) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: payout_released :: connector ${recipientId} unreachable`
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
    Slug.RecruitmentConnectorPayoutReleased,
    connectorEmail,
    escapeVars({
      recipientName: formatUserDisplayName(connector ?? {}),
      candidateName,
      jobTitle: payout.jobTitle,
      companyName: payout.companyName,
      ...creditBreakdown,
      releasedDate,
      estimatedCreditDate,
      needsBankSetup: !hasBankAccount,
      stripeSetupUrl: buildStripeSetupUrl(),
    }),
    `payout_released connector payout=${payoutId}`,
    { log: logContext }
  );
}
