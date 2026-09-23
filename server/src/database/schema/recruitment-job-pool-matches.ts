import {
  uuid,
  varchar,
  timestamp,
  numeric,
  jsonb,
  bigint,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { recruitmentJobsSchema } from "./recruitment-jobs";
import { contacts } from "./contacts";
import { mediaSchema } from "./media.schema";

export const recruitmentJobPoolMatches = prospectlySchema.table(
  "recruitment_job_pool_matches",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobId: uuid("job_id")
      .notNull()
      .references(() => recruitmentJobsSchema.id, { onDelete: "cascade" }),
    contactId: bigint("contact_id", { mode: "number" })
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    connectorUserId: uuid("connector_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchScore: numeric("match_score", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    cosineSimilarity: numeric("cosine_similarity", { precision: 5, scale: 4 }),
    llmScore: numeric("llm_score", { precision: 5, scale: 2 }),
    matchedSignals: jsonb("matched_signals").default(sql`'[]'`),
    concerns: jsonb("concerns").default(sql`'[]'`),
    gapAnalysis: jsonb("gap_analysis"),
    status: varchar("status", { length: 30 }).notNull().default("pending"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    consentToken: varchar("consent_token", { length: 2048 }),
    consentSentAt: timestamp("consent_sent_at", { withTimezone: true }),
    consentRespondedAt: timestamp("consent_responded_at", {
      withTimezone: true,
    }),
    consentDeclineReason: varchar("consent_decline_reason", { length: 100 }),
    consentDeclineNotes: varchar("consent_decline_notes", { length: 1000 }),
    connectorDeclineReason: varchar("connector_decline_reason", {
      length: 500,
    }),
    connectorDeclinedAt: timestamp("connector_declined_at", {
      withTimezone: true,
    }),
    source: varchar("source", { length: 30 }).notNull().default("ai_matched"),
    failureReason: varchar("failure_reason", { length: 500 }),
    resumeMediaId: uuid("resume_media_id").references(() => mediaSchema.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    uniqueJobContactConnector: unique(
      "unique_job_pool_match_job_contact_connector"
    ).on(table.jobId, table.contactId, table.connectorUserId),
    connectorStatusIdx: index("idx_job_pool_matches_connector_status").on(
      table.connectorUserId,
      table.status
    ),
    jobIdIdx: index("idx_job_pool_matches_job_id").on(table.jobId),
    contactIdIdx: index("idx_job_pool_matches_contact_id").on(table.contactId),
  })
);

export type RecruitmentJobPoolMatch =
  typeof recruitmentJobPoolMatches.$inferSelect;
export type NewRecruitmentJobPoolMatch =
  typeof recruitmentJobPoolMatches.$inferInsert;
