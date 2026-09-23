import * as schema from "database/schema";
import { and, eq, isNull } from "drizzle-orm";
import { hashData, normalizeLinkedIn } from "services/contactMatchingService";
import { encryptContactFields } from "services/encryptionService";
import { toCanonicalLinkedInProfileUrl } from "utils/linkedin-profile.utils";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type Db = PostgresJsDatabase<typeof schema>;
/** Drizzle transaction client — shared with LinkedIn sync/apply callers. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

/**
 * Write LinkedIn onto contacts + contact_sensitive (overwrite).
 * Caller must pass an open transaction so both writes stay atomic with
 * surrounding apply/extract work. Soft-deleted contacts are skipped.
 * Returns the canonical URL, or null when invalid / contact missing.
 */
export async function upsertContactLinkedin(
  tx: DbOrTx,
  contactId: number,
  linkedinUrl: string | null | undefined,
  now: Date
): Promise<string | null> {
  const displayUrl = toCanonicalLinkedInProfileUrl(linkedinUrl);
  if (!displayUrl) return null;

  const normalized = normalizeLinkedIn(displayUrl);
  if (!normalized) return null;

  const encryptedFields = await encryptContactFields({
    linkedin: displayUrl,
  });
  const linkedinHash = hashData(normalized);

  const updated = await tx
    .update(schema.contacts)
    .set({ linkedin: displayUrl, updatedAt: now })
    .where(
      and(eq(schema.contacts.id, contactId), isNull(schema.contacts.deletedAt))
    )
    .returning({ id: schema.contacts.id });

  if (updated.length === 0) return null;

  await tx
    .update(schema.contactSensitiveData)
    .set({
      linkedin: encryptedFields.linkedin,
      linkedinHash,
    })
    .where(eq(schema.contactSensitiveData.contactId, contactId));

  return displayUrl;
}
