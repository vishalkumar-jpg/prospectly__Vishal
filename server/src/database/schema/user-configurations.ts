import {
  uuid,
  boolean,
  timestamp,
  jsonb,
  varchar,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

export const importTabModeEnum = prospectlySchema.enum("import_tab_mode", [
  "intro",
  "automatic",
  "manual",
  "automatic-credentials",
]);

export const linkedinImportTabEnum = prospectlySchema.enum(
  "linkedin_import_tab",
  ["instructions", "upload_zip"]
);

export const userConfigurations = prospectlySchema.table(
  "user_configurations",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    hasSeenWelcomePopup: boolean("has_seen_welcome_popup")
      .default(false)
      .notNull(),
    googleImportTab: importTabModeEnum("google_import_tab")
      .notNull()
      .default("automatic"),
    microsoftImportTab: importTabModeEnum("microsoft_import_tab")
      .notNull()
      .default("automatic"),
    appleImportTab: importTabModeEnum("apple_import_tab")
      .notNull()
      .default("intro"),
    linkedinImportTab: linkedinImportTabEnum("linkedin_import_tab")
      .notNull()
      .default("instructions"),
    isUserUnsubscribe: boolean("is_user_unsubscribe").notNull().default(false),
    hasImportedContacts: boolean("has_imported_contacts")
      .notNull()
      .default(false),
    hasSkipBankAccount: boolean("has_skip_bank_account")
      .notNull()
      .default(false),
    hasSkippedOrganisation: boolean("has_skipped_organisation")
      .notNull()
      .default(false),
    /** Getting Started preferred workspace: recruiting | prospecting | both */
    preferredWorkspace: varchar("preferred_workspace", { length: 20 })
      .notNull()
      .default("recruiting"),
    /** Active sidebar/header primary workspace: recruiting | prospecting */
    primaryWorkspace: varchar("primary_workspace", { length: 20 })
      .notNull()
      .default("recruiting"),
    lastReminderSentAt: timestamp("last_reminder_sent_at"),
    // Single jsonb blob for all pipeline stage filters (no legacy 4-column split).
    // Shape: { requester, connector, recruiter, my_pipeline } → string[] each.
    // Empty arrays = show all stages. Old per-column values are intentionally not migrated.
    userFilter: jsonb("user_filter")
      .$type<{
        requester: string[];
        connector: string[];
        recruiter: string[];
        my_pipeline: string[];
      }>()
      .default(
        sql`'{"requester":[],"connector":[],"recruiter":[],"my_pipeline":[]}'::jsonb`
      ),
    accountDeletionRequestedAt: timestamp("account_deletion_requested_at"),
    accountDeletionScheduledAt: timestamp("account_deletion_scheduled_at"),
    // Generic per-user working hours used to generate bookable meeting slots
    // (e.g. recruitment interview booking). Times are "HH:mm" (30-min aligned),
    // timezone is IANA. Nullable: when null, a 09:00-17:00 default is applied in code.
    workingHoursStart: varchar("working_hours_start", { length: 5 }),
    workingHoursEnd: varchar("working_hours_end", { length: 5 }),
    workingHoursTimezone: varchar("working_hours_timezone", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    check(
      "user_configurations_preferred_workspace_check",
      sql`${table.preferredWorkspace} IN ('recruiting', 'prospecting', 'both')`
    ),
    check(
      "user_configurations_primary_workspace_check",
      sql`${table.primaryWorkspace} IN ('recruiting', 'prospecting')`
    ),
    check(
      "user_configurations_workspace_consistency_check",
      sql`${table.preferredWorkspace} = 'both' OR ${table.primaryWorkspace} = ${table.preferredWorkspace}`
    ),
  ]
);

export type UserConfiguration = typeof userConfigurations.$inferSelect;
export type NewUserConfiguration = typeof userConfigurations.$inferInsert;
