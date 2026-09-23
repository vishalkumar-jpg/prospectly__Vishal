import {
  uuid,
  varchar,
  integer,
  timestamp,
  index,
  text,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

export const contactFileImports = prospectlySchema.table(
  "contact_file_imports",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    filePath: varchar("file_path", { length: 500 }).notNull(),
    uploadId: varchar("upload_id", { length: 255 }),
    fileType: varchar("file_type", { length: 10 }).notNull(),
    totalRecords: integer("total_records").default(0).notNull(),
    processedRecords: integer("processed_records").default(0).notNull(),
    successCount: integer("success_count").default(0).notNull(),
    failedCount: integer("failed_count").default(0).notNull(),
    duplicateCount: integer("duplicate_count").default(0).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("PENDING"),
    enrichmentSource: varchar("enrichment_source", { length: 50 })
      .notNull()
      .default("apollo"),
    completionWarnings: text("completion_warnings"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    createdByIdx: index("idx_contact_file_imports_created_by").on(
      table.createdBy
    ),
    statusIdx: index("idx_contact_file_imports_status").on(table.status),
    createdAtIdx: index("idx_contact_file_imports_created_at").on(
      table.createdAt
    ),
  })
);

export type ContactFileImport = typeof contactFileImports.$inferSelect;
export type NewContactFileImport = typeof contactFileImports.$inferInsert;
