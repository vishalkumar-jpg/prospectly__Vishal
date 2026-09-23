import {
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { recruitmentJobsSchema } from "./recruitment-jobs";
import { recruitmentJobCandidates } from "./recruitment-job-candidates";
import { recruitmentJobPoolMatches } from "./recruitment-job-pool-matches";

/**
 * Per-email delivery log for recruitment sends (Resend webhook updates status).
 * Batch totals remain on recruitment_notifications; this table is per recipient.
 * `providerId` stores the email-provider message id (e.g. Resend email id).
 */
export const recruitmentEmailLogsSchema = prospectlySchema.table(
  "recruitment_email_logs",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobId: uuid("job_id")
      .notNull()
      .references(() => recruitmentJobsSchema.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id").references(
      () => recruitmentJobCandidates.id,
      { onDelete: "cascade" }
    ),
    poolMatchId: uuid("pool_match_id").references(
      () => recruitmentJobPoolMatches.id,
      { onDelete: "cascade" }
    ),
    emailType: varchar("email_type", { length: 50 }).notNull(),
    recipientType: varchar("recipient_type", { length: 20 })
      .default("candidate")
      .notNull(),
    providerId: varchar("provider_id", { length: 100 }),
    recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 255 }),
    emailBody: text("email_body"),
    status: varchar("status", { length: 30 }).default("sent").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    detailAt: timestamp("detail_at", { withTimezone: true }),
    detailType: varchar("detail_type", { length: 50 }),
    detailReason: text("detail_reason"),
    eventType: varchar("event_type", { length: 50 }),
    eventAt: timestamp("event_at", { withTimezone: true }),
    rawEvents: jsonb("raw_events").default(sql`'[]'::jsonb`),
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
    jobIdIdx: index("idx_recruitment_email_logs_job_id").on(table.jobId),
    candidateIdIdx: index("idx_recruitment_email_logs_candidate_id").on(
      table.candidateId
    ),
    poolMatchIdIdx: index("idx_recruitment_email_logs_pool_match_id").on(
      table.poolMatchId
    ),
    statusIdx: index("idx_recruitment_email_logs_status").on(table.status),
    jobStatusIdx: index("idx_recruitment_email_logs_job_status").on(
      table.jobId,
      table.status
    ),
    providerIdUid: uniqueIndex("uq_recruitment_email_logs_provider_id").on(
      table.providerId
    ),
  })
);

export type RecruitmentEmailLog =
  typeof recruitmentEmailLogsSchema.$inferSelect;
export type NewRecruitmentEmailLog =
  typeof recruitmentEmailLogsSchema.$inferInsert;
