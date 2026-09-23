import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { resolveUserEmail } from "modules/recruitment/notifications/processors/recruitment-lifecycle-send.helper";
import { RECRUITMENT_EMAIL_RECIPIENT_TYPE } from "./recruitment-email-logs.constants";

type ResendLog = {
  recipientType: string;
  candidateId: string | null;
  recipientEmail: string;
};

/**
 * Resolve the address a resend should go to.
 *
 * `recruitment_email_logs.recipient_email` is a snapshot taken at original send
 * time, so replaying it re-delivers to whatever address was current then —
 * including the contact-table addresses written before lifecycle email
 * standardised on `users.email`. Re-resolving keeps resends aligned with every
 * other recruitment email.
 *
 * Only candidate logs are re-resolved, via the candidate row's immutable
 * `candidate_user_id`. Anything unresolvable falls back to the stored address
 * so a resend never turns into a hard failure.
 */
export async function resolveResendRecipientEmail(
  db: PostgresJsDatabase<typeof schema>,
  log: ResendLog
): Promise<string> {
  if (!log.candidateId) {
    return log.recipientEmail;
  }

  if (log.recipientType === RECRUITMENT_EMAIL_RECIPIENT_TYPE.CANDIDATE) {
    const [candidate] = await db
      .select({
        candidateUserId: schema.recruitmentJobCandidates.candidateUserId,
      })
      .from(schema.recruitmentJobCandidates)
      .where(
        and(
          eq(schema.recruitmentJobCandidates.id, log.candidateId),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      )
      .limit(1);

    if (!candidate) return log.recipientEmail;
    return (
      (await resolveUserEmail(db, candidate.candidateUserId)) ??
      log.recipientEmail
    );
  }

  // Connector logs keep their stored address. The log does not record which
  // connector was mailed, and the current links cannot stand in for it:
  // `connector_user_id` cascades on user delete, so a split pair can shrink to
  // one and a surviving connector would wrongly absorb the other's resend.
  // Nothing is lost by replaying — connector addresses were always resolved
  // from `users.email`, which no code path ever updates.
  return log.recipientEmail;
}
