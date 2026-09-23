import { ConflictException } from "@nestjs/common";
import { and, eq, isNull, ne } from "drizzle-orm";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CONSENT_MESSAGES } from "./consent.constants";
import { isConnectorBlockedForCandidate } from "./consent-connector-block.utils";
import {
  isJobAppliedForEmail,
  isJobConsentAcceptedForEmail,
} from "./consent-job-claim.utils";

type ConsentChangeDb = PostgresJsDatabase<typeof schema>;

/** Guards shared by in-place update and existing-contact re-link (change-email only). */
export async function assertConsentChangeEmailTargetAllowed(
  db: ConsentChangeDb,
  match: typeof schema.recruitmentJobPoolMatches.$inferSelect,
  newHash: string,
  options?: { skipDuplicateUploadCheck?: boolean }
): Promise<void> {
  if (
    await isConnectorBlockedForCandidate(db, {
      connectorUserId: match.connectorUserId,
      candidateEmailHash: newHash,
    })
  ) {
    throw new ConflictException(
      CONSENT_MESSAGES.ERROR.CONNECTOR_BLOCKED_BY_CANDIDATE
    );
  }

  if (
    await isJobConsentAcceptedForEmail(db, {
      jobId: match.jobId,
      emailHash: newHash,
      contactId: match.contactId,
    })
  ) {
    throw new ConflictException(
      CONSENT_MESSAGES.ERROR.CLAIMED_BY_OTHER_CONNECTOR
    );
  }

  if (
    await isJobAppliedForEmail(db, {
      jobId: match.jobId,
      emailHash: newHash,
      contactId: match.contactId,
    })
  ) {
    throw new ConflictException(
      CONSENT_MESSAGES.ERROR.CANDIDATE_ALREADY_APPLIED
    );
  }

  if (options?.skipDuplicateUploadCheck) {
    return;
  }

  const duplicateUpload = await db.query.recruitmentUploadJobs.findFirst({
    where: and(
      eq(schema.recruitmentUploadJobs.jobId, match.jobId),
      eq(schema.recruitmentUploadJobs.connectorUserId, match.connectorUserId),
      eq(schema.recruitmentUploadJobs.candidateEmailHash, newHash),
      isNull(schema.recruitmentUploadJobs.deletedAt),
      ne(schema.recruitmentUploadJobs.poolMatchId, match.id)
    ),
    columns: { id: true },
  });

  if (duplicateUpload) {
    throw new ConflictException(CONSENT_MESSAGES.ERROR.DUPLICATE_UPLOAD_EMAIL);
  }
}
