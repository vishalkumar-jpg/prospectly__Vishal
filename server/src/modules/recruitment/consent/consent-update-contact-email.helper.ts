import { eq } from "drizzle-orm";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { toUTC } from "utils/dayjs";
import { encryptContactFields, maskEmail } from "services/encryptionService";
import {
  generateContactHashes,
  type IncomingContact,
} from "services/contactMatchingService";
import { encryptNormalizedEmail } from "services/contactImportService";

type ConsentDb = PostgresJsDatabase<typeof schema>;

export async function updateContactEmailForConsent(
  db: ConsentDb,
  contactId: number,
  normalizedEmail: string
): Promise<void> {
  const maskedEmail = maskEmail(normalizedEmail);
  const now = toUTC();

  const [encryptedFields, encryptedNormalizedEmail] = await Promise.all([
    encryptContactFields({ email: normalizedEmail }),
    encryptNormalizedEmail(normalizedEmail),
  ]);

  const hashes = generateContactHashes({
    email: normalizedEmail,
  } as IncomingContact);

  await db.transaction(async (tx) => {
    await tx
      .update(schema.contacts)
      .set({ email: maskedEmail, updatedAt: now })
      .where(eq(schema.contacts.id, contactId));

    await tx
      .update(schema.contactSensitiveData)
      .set({
        email: encryptedFields.email,
        normalizedEmail: encryptedNormalizedEmail,
        normalizedEmailHash: hashes.normalizedEmailHash,
        updatedAt: now,
      })
      .where(eq(schema.contactSensitiveData.contactId, contactId));
  });
}
