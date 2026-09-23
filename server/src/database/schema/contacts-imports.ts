import {
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { calendarIntegrations } from "./calendar-integrations";
import { contactsProviderTokens } from "./contacts-provider-tokens";
import { prospectlySchema } from "./schema-definition";

export const contactsImports = prospectlySchema.table(
  "contact_imports",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    provider: varchar("provider", { length: 50 }).notNull(),
    integrationId: uuid("integration_id").references(
      () => calendarIntegrations.id,
      { onDelete: "set null" }
    ),
    tokenId: uuid("token_id").references(() => contactsProviderTokens.id, {
      onDelete: "set null",
    }),
    email: varchar("email", { length: 255 }), // Keep for display purposes
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    imported: integer("imported").default(0).notNull(),
    failed: integer("failed").default(0).notNull(),
    duplicates: integer("duplicates").default(0).notNull(),
    totalFetched: integer("total_fetched").default(0).notNull(),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_contact_imports_user_id").on(table.userId),
    providerIdx: index("idx_contact_imports_provider").on(table.provider),
    integrationIdIdx: index("idx_contact_imports_integration_id").on(
      table.integrationId
    ),
    tokenIdIdx: index("idx_contact_imports_token_id").on(table.tokenId),
    statusIdx: index("idx_contact_imports_status").on(table.status),
    createdAtIdx: index("idx_contact_imports_created_at").on(table.createdAt),
    userProviderIdx: index("idx_contact_imports_user_provider").on(
      table.userId,
      table.provider
    ),
  })
);

export type ContactsImport = typeof contactsImports.$inferSelect;
export type NewContactsImport = typeof contactsImports.$inferInsert;
