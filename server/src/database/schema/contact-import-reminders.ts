import {
  uuid,
  varchar,
  integer,
  timestamp,
  text,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { users } from "./users";
import { prospectlySchema } from "./schema-definition";

export const contactImportReminders = prospectlySchema.table(
  "contact_import_reminders",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    templateSlug: varchar("template_slug", {
      length: 255,
    }).notNull(),

    reminderDay: integer("reminder_day").notNull(),

    processedAt: timestamp("processed_at").notNull().defaultNow(),

    status: varchar("status", {
      length: 50,
    }).notNull(),

    error: text("error"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
  },
  (table) => ({
    reminderDayNonNegative: check(
      "contact_import_reminders_reminder_day_non_negative_chk",
      sql`${table.reminderDay} >= 0`
    ),
    userIdReminderDayStatusIdx: index("user_id_reminder_day_status_idx").on(
      table.userId,
      table.reminderDay,
      table.status
    ),
    deletedAtIndex: index("deleted_at_idx").on(table.deletedAt),
  })
);

export type ContactImportReminder = typeof contactImportReminders.$inferSelect;
export type NewContactImportReminder =
  typeof contactImportReminders.$inferInsert;
