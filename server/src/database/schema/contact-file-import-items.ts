import {
  uuid,
  varchar,
  text,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { contactFileImports } from "./contact-file-imports";
import { prospectlySchema } from "./schema-definition";

export const contactFileImportItems = prospectlySchema.table(
  "contact_file_import_items",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    importId: uuid("import_id")
      .notNull()
      .references(() => contactFileImports.id, { onDelete: "cascade" }),
    rawData: jsonb("raw_data").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("PENDING"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    importIdIdx: index("idx_contact_file_import_items_import_id").on(
      table.importId
    ),
    statusIdx: index("idx_contact_file_import_items_status").on(table.status),
  })
);

export type ContactFileImportItem = typeof contactFileImportItems.$inferSelect;
export type NewContactFileImportItem =
  typeof contactFileImportItems.$inferInsert;
