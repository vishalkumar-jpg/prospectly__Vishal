import { eq, inArray, or, type SQL } from "drizzle-orm";
import * as schema from "database/schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/**
 * Hard-deletes the derived resume search index for a user, so no embedding or
 * resume text outlives the account.
 *
 * Must run BEFORE deleteUserRelatedData: that hard-deletes
 * recruitment_job_candidates, and contact_resumes.candidate_id is
 * ON DELETE SET NULL, after which these rows are orphaned and unattributable.
 *
 * Resumes reached through a contact are NOT covered here — see
 * purgeResumeSearchIndexForContacts, which has to run at a different moment.
 */
export async function purgeResumeSearchIndexForUser(
  tx: PostgresJsDatabase<typeof schema>,
  userId: string
): Promise<void> {
  const candidateResumes = tx
    .select({ id: schema.recruitmentJobCandidates.id })
    .from(schema.recruitmentJobCandidates)
    .where(eq(schema.recruitmentJobCandidates.candidateUserId, userId));

  const ownership: SQL[] = [
    eq(schema.contactResumes.uploadedBy, userId),
    inArray(schema.contactResumes.candidateId, candidateResumes),
  ];

  const targets = tx
    .select({ id: schema.contactResumes.id })
    .from(schema.contactResumes)
    .where(or(...ownership));

  await tx
    .delete(schema.contactResumeSearch)
    .where(inArray(schema.contactResumeSearch.contactResumeId, targets));
}

/**
 * The contact-linked half, split out because of when it has to run.
 *
 * contacts is hard-deleted during a purge and contact_resumes.contact_id is
 * ON DELETE SET NULL, so Postgres severs the link in the same statement. Called
 * after the delete this matches nothing; it must be called immediately before,
 * while the rows still point at the contacts that are about to go.
 */
export async function purgeResumeSearchIndexForContacts(
  tx: PostgresJsDatabase<typeof schema>,
  contactIds: number[]
): Promise<void> {
  if (contactIds.length === 0) return;

  const targets = tx
    .select({ id: schema.contactResumes.id })
    .from(schema.contactResumes)
    .where(inArray(schema.contactResumes.contactId, contactIds));

  await tx
    .delete(schema.contactResumeSearch)
    .where(inArray(schema.contactResumeSearch.contactResumeId, targets));
}
