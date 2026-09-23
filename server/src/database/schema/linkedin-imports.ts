import { uuid, varchar, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { contactsImports } from "./contacts-imports";
import { prospectlySchema } from "./schema-definition";

export const linkedinImports = prospectlySchema.table(
  "linkedin_imports",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    importRecordId: uuid("import_record_id")
      .notNull()
      .references(() => contactsImports.id, { onDelete: "cascade" }),
    s3Key: varchar("s3_key", { length: 500 }).notNull(),
    linkedinProfileUrl: varchar("linkedin_profile_url", { length: 255 }),
    profileData: jsonb("profile_data"),
    extractionLog: jsonb("extraction_log"),
    processingLog: jsonb("processing_log"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_linkedin_imports_user_id").on(table.userId),
    importRecordIdIdx: index("idx_linkedin_imports_import_record_id").on(
      table.importRecordId
    ),
    createdAtIdx: index("idx_linkedin_imports_created_at").on(table.createdAt),
  })
);

export type LinkedInImport = typeof linkedinImports.$inferSelect;
export type NewLinkedInImport = typeof linkedinImports.$inferInsert;
