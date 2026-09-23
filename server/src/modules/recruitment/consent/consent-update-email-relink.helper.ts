import { and, eq, isNull, ne } from "drizzle-orm";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { toUTC } from "utils/dayjs";
import {
  JOB_POOL_MATCH_SOURCE,
  JOB_POOL_MATCH_STATUS,
} from "modules/recruitment/job-pool-matches/job-pool-matches.constants";

type ConsentChangeDb = PostgresJsDatabase<typeof schema>;

export type ConsentEmailRelinkResult = {
  targetMatchId: string;
  targetContactId: number;
};

/** Change-email only: find another contact that already owns this email hash. */
export async function findExistingContactIdForConsentEmailChange(
  db: ConsentChangeDb,
  emailHash: string,
  currentContactId: number
): Promise<number | null> {
  const [row] = await db
    .select({ contactId: schema.contactSensitiveData.contactId })
    .from(schema.contactSensitiveData)
    .where(
      and(
        eq(schema.contactSensitiveData.normalizedEmailHash, emailHash),
        ne(schema.contactSensitiveData.contactId, currentContactId)
      )
    )
    .limit(1);

  return row?.contactId ?? null;
}

/**
 * Change-email only: attach this referral to an existing contact (upload parity).
 * Merges into an existing pool match when the unique job+contact+connector row exists.
 */
export async function relinkConsentMatchToExistingContact(
  db: ConsentChangeDb,
  params: {
    sourceMatch: typeof schema.recruitmentJobPoolMatches.$inferSelect;
    targetContactId: number;
    emailHash: string;
  }
): Promise<ConsentEmailRelinkResult> {
  const { sourceMatch, targetContactId, emailHash } = params;
  const now = toUTC();

  return db.transaction(async (tx) => {
    const [existingTargetMatch] = await tx
      .select()
      .from(schema.recruitmentJobPoolMatches)
      .where(
        and(
          eq(schema.recruitmentJobPoolMatches.jobId, sourceMatch.jobId),
          eq(
            schema.recruitmentJobPoolMatches.connectorUserId,
            sourceMatch.connectorUserId
          ),
          eq(schema.recruitmentJobPoolMatches.contactId, targetContactId),
          isNull(schema.recruitmentJobPoolMatches.deletedAt),
          ne(schema.recruitmentJobPoolMatches.id, sourceMatch.id)
        )
      )
      .limit(1);

    if (existingTargetMatch) {
      await tx
        .update(schema.recruitmentJobPoolMatches)
        .set({
          resumeMediaId:
            sourceMatch.resumeMediaId ?? existingTargetMatch.resumeMediaId,
          matchScore: sourceMatch.matchScore,
          matchedSignals: sourceMatch.matchedSignals,
          concerns: sourceMatch.concerns,
          gapAnalysis: sourceMatch.gapAnalysis,
          source: JOB_POOL_MATCH_SOURCE.CONNECTOR_UPLOADED,
          status: JOB_POOL_MATCH_STATUS.CONSENT_PENDING,
          failureReason: null,
          updatedAt: now,
        })
        .where(eq(schema.recruitmentJobPoolMatches.id, existingTargetMatch.id));

      await tx
        .update(schema.recruitmentJobPoolMatches)
        .set({
          status: JOB_POOL_MATCH_STATUS.CONSENT_SUPERSEDED,
          consentToken: null,
          consentRespondedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.recruitmentJobPoolMatches.id, sourceMatch.id));

      await tx
        .update(schema.recruitmentUploadJobs)
        .set({
          poolMatchId: existingTargetMatch.id,
          candidateEmailHash: emailHash,
          updatedAt: now,
        })
        .where(eq(schema.recruitmentUploadJobs.poolMatchId, sourceMatch.id));

      return {
        targetMatchId: existingTargetMatch.id,
        targetContactId,
      };
    }

    await tx
      .update(schema.recruitmentJobPoolMatches)
      .set({ contactId: targetContactId, updatedAt: now })
      .where(eq(schema.recruitmentJobPoolMatches.id, sourceMatch.id));

    await tx
      .update(schema.recruitmentUploadJobs)
      .set({ candidateEmailHash: emailHash, updatedAt: now })
      .where(eq(schema.recruitmentUploadJobs.poolMatchId, sourceMatch.id));

    return {
      targetMatchId: sourceMatch.id,
      targetContactId,
    };
  });
}
