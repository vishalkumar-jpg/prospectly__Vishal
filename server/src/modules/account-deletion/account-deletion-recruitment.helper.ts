import { eq, or, inArray } from "drizzle-orm";
import * as schema from "database/schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/** Clears recruitment rows and nullable user audit FKs in dependency-safe order. */
export async function purgeRecruitmentDataForUser(
  tx: PostgresJsDatabase<typeof schema>,
  userId: string
): Promise<void> {
  const userMeetings = tx
    .select({ id: schema.recruitmentInterviewMeetings.id })
    .from(schema.recruitmentInterviewMeetings)
    .where(
      or(
        eq(schema.recruitmentInterviewMeetings.recruiterId, userId),
        eq(schema.recruitmentInterviewMeetings.candidateUserId, userId)
      )
    );

  const userCandidates = tx
    .select({ id: schema.recruitmentJobCandidates.id })
    .from(schema.recruitmentJobCandidates)
    .where(eq(schema.recruitmentJobCandidates.candidateUserId, userId));

  const userJobs = tx
    .select({ id: schema.recruitmentJobsSchema.id })
    .from(schema.recruitmentJobsSchema)
    .where(eq(schema.recruitmentJobsSchema.requesterId, userId));

  // Payouts reference meetings (no action) and candidates (restrict) — remove first.
  await tx
    .delete(schema.recruitmentPayoutHistory)
    .where(
      or(
        eq(schema.recruitmentPayoutHistory.recruiterId, userId),
        eq(schema.recruitmentPayoutHistory.recipientId, userId),
        inArray(
          schema.recruitmentPayoutHistory.interviewMeetingId,
          userMeetings
        ),
        inArray(schema.recruitmentPayoutHistory.candidateId, userCandidates)
      )
    );

  await tx
    .delete(schema.recruitmentInterviewTransactions)
    .where(
      or(
        eq(schema.recruitmentInterviewTransactions.recruiterId, userId),
        inArray(
          schema.recruitmentInterviewTransactions.candidateId,
          userCandidates
        )
      )
    );

  await nullRecruitmentMeetingUserRefs(tx, userId);

  await tx
    .delete(schema.recruitmentInterviewMeetings)
    .where(
      or(
        eq(schema.recruitmentInterviewMeetings.recruiterId, userId),
        eq(schema.recruitmentInterviewMeetings.candidateUserId, userId)
      )
    );

  await tx
    .delete(schema.recruitmentJobCandidates)
    .where(eq(schema.recruitmentJobCandidates.candidateUserId, userId));

  await tx
    .delete(schema.recruitmentJobPricesSchema)
    .where(inArray(schema.recruitmentJobPricesSchema.jobId, userJobs));

  await tx
    .delete(schema.recruitmentJobsSchema)
    .where(eq(schema.recruitmentJobsSchema.requesterId, userId));

  await nullRecruitmentAuditUserRefs(tx, userId);
}

async function nullRecruitmentMeetingUserRefs(
  tx: PostgresJsDatabase<typeof schema>,
  userId: string
): Promise<void> {
  await tx
    .update(schema.recruitmentInterviewMeetings)
    .set({ interviewOutcomeMarkedBy: null })
    .where(
      eq(schema.recruitmentInterviewMeetings.interviewOutcomeMarkedBy, userId)
    );

  await tx
    .update(schema.recruitmentInterviewMeetingHistory)
    .set({ performedBy: null })
    .where(eq(schema.recruitmentInterviewMeetingHistory.performedBy, userId));

  await tx
    .update(schema.recruitmentInterviewMeetings)
    .set({ createdBy: null })
    .where(eq(schema.recruitmentInterviewMeetings.createdBy, userId));

  await tx
    .update(schema.recruitmentInterviewMeetings)
    .set({ updatedBy: null })
    .where(eq(schema.recruitmentInterviewMeetings.updatedBy, userId));
}

async function nullRecruitmentAuditUserRefs(
  tx: PostgresJsDatabase<typeof schema>,
  userId: string
): Promise<void> {
  const tablesWithCreatedUpdated = [
    schema.recruitmentPayoutHistory,
    schema.recruitmentInterviewTransactions,
    schema.recruitmentJobCandidates,
    schema.recruitmentJobsSchema,
    schema.recruitmentJobPricesSchema,
    schema.recruitmentJobSettingsSchema,
    schema.recruitmentNotificationsSchema,
    schema.recruitmentCandidateStageHistory,
    schema.recruitmentCandidateWorkflow,
  ] as const;

  for (const table of tablesWithCreatedUpdated) {
    await tx
      .update(table)
      .set({ createdBy: null })
      .where(eq(table.createdBy, userId));
    await tx
      .update(table)
      .set({ updatedBy: null })
      .where(eq(table.updatedBy, userId));
  }

  await tx
    .update(schema.recruitmentInterviewTransactions)
    .set({ connectorUserId: null })
    .where(eq(schema.recruitmentInterviewTransactions.connectorUserId, userId));

  await tx
    .update(schema.recruitmentConnectorOrigins)
    .set({ createdBy: null })
    .where(eq(schema.recruitmentConnectorOrigins.createdBy, userId));

  await tx
    .update(schema.recruitmentCandidateConnectors)
    .set({ createdBy: null })
    .where(eq(schema.recruitmentCandidateConnectors.createdBy, userId));

  await tx
    .update(schema.recruitmentJobShares)
    .set({ sharerId: null })
    .where(eq(schema.recruitmentJobShares.sharerId, userId));
}
