import { Logger } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import { RECRUITMENT_PAYOUT_TYPE } from "modules/recruitment/payout/recruitment-payout.constants";
import type { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import type { PayoutSetupLifecycleJobData } from "../recruitment-lifecycle-notifications.constants";
import {
  formatRecruitmentUsd,
  formatUserDisplayName,
} from "./recruitment-lifecycle-format.util";
import {
  escapeVars,
  buildLifecycleLogContext,
  resolveUserEmail,
  sendLifecycleEmail,
} from "./recruitment-lifecycle-send.helper";
import { buildStripeSetupUrl } from "../recruitment-notification-urls.util";

export async function processPayoutSetupLifecycleNotification(
  db: PostgresJsDatabase<typeof schema>,
  emailsService: EmailsService,
  emailLogsService: RecruitmentEmailLogsService,
  logger: Logger,
  data: PayoutSetupLifecycleJobData
): Promise<void> {
  const { payoutId, recipientId } = data;
  if (!payoutId || !recipientId) return;

  const [payout] = await db
    .select({
      payoutType: schema.recruitmentPayoutHistory.payoutType,
      recipientAmount: schema.recruitmentPayoutHistory.recipientAmount,
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

  if (!payout) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: payout_setup :: payout ${payoutId} not found`
    );
    return;
  }

  const email = await resolveUserEmail(db, recipientId);
  if (!email) {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: payout_setup :: recipient ${recipientId} unreachable`
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

  let slug: Slug;
  if (payout.payoutType === RECRUITMENT_PAYOUT_TYPE.CANDIDATE) {
    slug = Slug.RecruitmentCandidatePayoutSetup;
  } else if (payout.payoutType === RECRUITMENT_PAYOUT_TYPE.CONNECTOR) {
    slug = Slug.RecruitmentConnectorPayoutSetup;
  } else {
    logger.warn(
      `RECRUITMENT_LIFECYCLE :: payout_setup :: unsupported payout type "${payout.payoutType}" for payout ${payoutId} — skipping`
    );
    return;
  }

  const logContext = payout.candidateId
    ? buildLifecycleLogContext(
        emailLogsService,
        { jobId: payout.jobId, requesterId: payout.requesterId },
        payout.candidateId,
        data.sentByUserId ?? payout.requesterId
      )
    : undefined;

  await sendLifecycleEmail(
    emailsService,
    logger,
    slug,
    email,
    escapeVars({
      recipientName: formatUserDisplayName(recipient ?? {}),
      jobTitle: payout.jobTitle,
      companyName: payout.companyName,
      payoutAmount: formatRecruitmentUsd(payout.recipientAmount),
      stripeSetupUrl: buildStripeSetupUrl(),
    }),
    `payout_setup payout=${payoutId} recipient=${recipientId}`,
    logContext ? { log: logContext } : undefined
  );
}
