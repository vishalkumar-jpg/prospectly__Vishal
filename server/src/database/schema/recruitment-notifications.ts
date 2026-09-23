import {
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { recruitmentJobsSchema } from "./recruitment-jobs";

export const recruitmentNotificationsSchema = prospectlySchema.table(
  "recruitment_notifications",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobId: uuid("job_id")
      .notNull()
      .references(() => recruitmentJobsSchema.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    totalRecipients: integer("total_recipients").default(0).notNull(),
    sentCount: integer("sent_count").default(0).notNull(),
    failedCount: integer("failed_count").default(0).notNull(),
    error: text("error"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
  },
  (table) => ({
    // Recruiters can send multiple notifications per job over time; the latest
    // row per (jobId, type) is surfaced in listings, so index for that lookup.
    jobTypeCreatedIdx: index(
      "idx_recruitment_notifications_job_type_created"
    ).on(table.jobId, table.type, table.createdAt),
    jobIdIdx: index("idx_recruitment_notifications_job_id").on(table.jobId),
    statusIdx: index("idx_recruitment_notifications_status").on(table.status),
  })
);

export type RecruitmentNotification =
  typeof recruitmentNotificationsSchema.$inferSelect;
export type NewRecruitmentNotification =
  typeof recruitmentNotificationsSchema.$inferInsert;
