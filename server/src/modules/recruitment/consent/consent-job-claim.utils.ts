import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import * as schema from "database/schema";
import {
  CLAIMED_STATUSES,
  JOB_POOL_MATCH_SOURCE,
  JOB_POOL_MATCH_STATUS,
} from "modules/recruitment/job-pool-matches/job-pool-matches.constants";
import { toUTC } from "utils/dayjs";
import crypto from "node:crypto";

type DbLike = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- drizzle db + tx share query API
  select: (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (...args: any[]) => any;
};

export function hashCandidateEmail(email: string): string {
  return crypto
    .createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex");
}

/** Contact IDs that share this candidate email (normalized hash). */
export async function findContactIdsByEmailHash(
  db: DbLike,
  emailHash: string,
  extraContactIds: number[] = []
): Promise<number[]> {
  const rows = await db
    .select({ contactId: schema.contactSensitiveData.contactId })
    .from(schema.contactSensitiveData)
    .where(eq(schema.contactSensitiveData.normalizedEmailHash, emailHash));

  const ids = new Set<number>(extraContactIds);
  for (const r of rows as { contactId: number | null }[]) {
    if (r.contactId != null) ids.add(r.contactId);
  }
  return [...ids];
}

/** True when any connector already won consent for this job + email. */
export async function isJobConsentAcceptedForEmail(
  db: DbLike,
  params: {
    jobId: string;
    emailHash: string;
    contactId?: number | null;
  }
): Promise<boolean> {
  const contactIds = await findContactIdsByEmailHash(
    db,
    params.emailHash,
    params.contactId != null ? [params.contactId] : []
  );
  if (contactIds.length === 0) return false;

  const [row] = await db
    .select({ id: schema.recruitmentJobPoolMatches.id })
    .from(schema.recruitmentJobPoolMatches)
    .where(
      and(
        eq(schema.recruitmentJobPoolMatches.jobId, params.jobId),
        inArray(schema.recruitmentJobPoolMatches.contactId, contactIds),
        inArray(schema.recruitmentJobPoolMatches.status, [...CLAIMED_STATUSES]),
        isNull(schema.recruitmentJobPoolMatches.deletedAt)
      )
    )
    .limit(1);

  return !!row;
}

/**
 * True when this email already has a job-candidate application for the job
 * (matching contactId or candidate user email).
 */
export async function isJobAppliedForEmail(
  db: DbLike,
  params: {
    jobId: string;
    emailHash: string;
    contactId?: number | null;
  }
): Promise<boolean> {
  const contactIds = await findContactIdsByEmailHash(
    db,
    params.emailHash,
    params.contactId != null ? [params.contactId] : []
  );

  if (contactIds.length > 0) {
    const [byContact] = await db
      .select({ id: schema.recruitmentJobCandidates.id })
      .from(schema.recruitmentJobCandidates)
      .where(
        and(
          eq(schema.recruitmentJobCandidates.jobId, params.jobId),
          inArray(schema.recruitmentJobCandidates.contactId, contactIds),
          isNull(schema.recruitmentJobCandidates.deletedAt)
        )
      )
      .limit(1);
    if (byContact) return true;
  }

  const appliedUsers = await db
    .select({ email: schema.users.email })
    .from(schema.recruitmentJobCandidates)
    .innerJoin(
      schema.users,
      eq(schema.recruitmentJobCandidates.candidateUserId, schema.users.id)
    )
    .where(
      and(
        eq(schema.recruitmentJobCandidates.jobId, params.jobId),
        isNull(schema.recruitmentJobCandidates.deletedAt)
      )
    );

  return (appliedUsers as { email: string }[]).some(
    (u) => hashCandidateEmail(u.email) === params.emailHash
  );
}

/** Supersede every other open match for this job that shares the candidate email. */
export async function supersedeOtherMatchesForJobEmail(
  db: DbLike,
  params: {
    jobId: string;
    emailHash: string;
    excludeMatchId: string;
    contactId?: number | null;
  }
): Promise<void> {
  const contactIds = await findContactIdsByEmailHash(
    db,
    params.emailHash,
    params.contactId != null ? [params.contactId] : []
  );
  if (contactIds.length === 0) return;

  const now = toUTC();
  await db
    .update(schema.recruitmentJobPoolMatches)
    .set({
      status: JOB_POOL_MATCH_STATUS.CONSENT_SUPERSEDED,
      consentRespondedAt: now,
      consentToken: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(schema.recruitmentJobPoolMatches.jobId, params.jobId),
        inArray(schema.recruitmentJobPoolMatches.contactId, contactIds),
        ne(schema.recruitmentJobPoolMatches.id, params.excludeMatchId),
        inArray(schema.recruitmentJobPoolMatches.status, [
          JOB_POOL_MATCH_STATUS.PENDING,
          JOB_POOL_MATCH_STATUS.APPROVED,
          JOB_POOL_MATCH_STATUS.CONSENT_PENDING,
        ]),
        isNull(schema.recruitmentJobPoolMatches.deletedAt)
      )
    );
}

/** Decline all pending consents from this connector for every contact of this email. */
export async function declinePendingMatchesForConnectorEmail(
  db: DbLike,
  params: {
    connectorUserId: string;
    emailHash: string;
    excludeMatchId: string;
    contactId?: number | null;
    reason: string;
    notes: string | null;
  }
): Promise<void> {
  const contactIds = await findContactIdsByEmailHash(
    db,
    params.emailHash,
    params.contactId != null ? [params.contactId] : []
  );
  if (contactIds.length === 0) return;

  const now = toUTC();
  await db
    .update(schema.recruitmentJobPoolMatches)
    .set({
      status: JOB_POOL_MATCH_STATUS.CONSENT_DECLINED,
      consentRespondedAt: now,
      consentDeclineReason: params.reason,
      consentDeclineNotes: params.notes,
      consentToken: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(
          schema.recruitmentJobPoolMatches.connectorUserId,
          params.connectorUserId
        ),
        inArray(schema.recruitmentJobPoolMatches.contactId, contactIds),
        ne(schema.recruitmentJobPoolMatches.id, params.excludeMatchId),
        inArray(schema.recruitmentJobPoolMatches.status, [
          JOB_POOL_MATCH_STATUS.CONSENT_PENDING,
        ]),
        isNull(schema.recruitmentJobPoolMatches.deletedAt)
      )
    );
}

/**
 * True when this connector already referred this email on this job
 * via a prior resume upload (upload row or connector_uploaded pool match).
 *
 * AI-matched pool rows alone must NOT block upload — job create queues
 * match compute, and the upload processor upgrades those rows in place.
 */
export async function isConnectorAlreadyReferredForJobEmail(
  db: DbLike,
  params: {
    jobId: string;
    connectorUserId: string;
    emailHash: string;
  }
): Promise<boolean> {
  const [priorUpload] = await db
    .select({ id: schema.recruitmentUploadJobs.id })
    .from(schema.recruitmentUploadJobs)
    .where(
      and(
        eq(schema.recruitmentUploadJobs.jobId, params.jobId),
        eq(
          schema.recruitmentUploadJobs.connectorUserId,
          params.connectorUserId
        ),
        eq(schema.recruitmentUploadJobs.candidateEmailHash, params.emailHash),
        isNull(schema.recruitmentUploadJobs.deletedAt)
      )
    )
    .limit(1);

  if (priorUpload) return true;

  const contactIds = await findContactIdsByEmailHash(db, params.emailHash);
  if (contactIds.length === 0) return false;

  const [match] = await db
    .select({ id: schema.recruitmentJobPoolMatches.id })
    .from(schema.recruitmentJobPoolMatches)
    .where(
      and(
        eq(schema.recruitmentJobPoolMatches.jobId, params.jobId),
        eq(
          schema.recruitmentJobPoolMatches.connectorUserId,
          params.connectorUserId
        ),
        inArray(schema.recruitmentJobPoolMatches.contactId, contactIds),
        eq(
          schema.recruitmentJobPoolMatches.source,
          JOB_POOL_MATCH_SOURCE.CONNECTOR_UPLOADED
        ),
        isNull(schema.recruitmentJobPoolMatches.deletedAt)
      )
    )
    .limit(1);

  return !!match;
}
