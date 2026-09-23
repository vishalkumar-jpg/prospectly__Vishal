import { text, timestamp, bigint, varchar, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { contacts } from "./contacts";
import { prospectlySchema } from "./schema-definition";

export const contactSensitiveData = prospectlySchema.table(
  "contact_sensitive_data",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .default(sql`nextval('contact_sensitive_data_id_seq')`),
    contactId: bigint("contact_id", { mode: "number" })
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    email: text("email"),
    phone: text("phone"),
    linkedin: text("linkedin"),
    secondaryEmail: text("secondary_email"),
    normalizedEmail: text("normalized_email"),
    normalizedPhone: text("normalized_phone"),
    normalizedSecondaryEmail: text("normalized_secondary_email"), // For efficient secondary email matching
    normalizedEmailHash: varchar("normalized_email_hash", { length: 64 }),
    normalizedPhoneHash: varchar("normalized_phone_hash", { length: 64 }),
    linkedinHash: varchar("linkedin_hash", { length: 64 }),
    normalizedSecondaryEmailHash: varchar("normalized_secondary_email_hash", {
      length: 64,
    }),
    encryptionKeyId: varchar("encryption_key_id", { length: 50 })
      .notNull()
      .default("default_key_v1"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    normalizedEmailHashIdx: index(
      "idx_contact_sensitive_normalized_email_hash"
    ).on(table.normalizedEmailHash),
    normalizedPhoneHashIdx: index(
      "idx_contact_sensitive_normalized_phone_hash"
    ).on(table.normalizedPhoneHash),
    linkedinHashIdx: index("idx_contact_sensitive_linkedin_hash").on(
      table.linkedinHash
    ),
    normalizedSecondaryEmailHashIdx: index(
      "idx_contact_sensitive_normalized_secondary_email_hash"
    ).on(table.normalizedSecondaryEmailHash),
    contactIdIdx: index("idx_contact_sensitive_contact_id").on(table.contactId),
  })
);

export type ContactSensitiveData = typeof contactSensitiveData.$inferSelect;
