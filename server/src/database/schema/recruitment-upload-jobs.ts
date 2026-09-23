import {
  uuid,
  varchar,
  timestamp,
  integer,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { recruitmentJobsSchema } from "./recruitment-jobs";
import { recruitmentJobPoolMatches } from "./recruitment-job-pool-matches";
import { mediaSchema } from "./media.schema";

export const recruitmentUploadJobs = prospectlySchema.table(
  "recruitment_upload_jobs",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobId: uuid("job_id")
      .notNull()
      .references(() => recruitmentJobsSchema.id, { onDelete: "cascade" }),
    connectorUserId: uuid("connector_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resumeMediaId: uuid("resume_media_id")
      .notNull()
      .references(() => mediaSchema.id),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    status: varchar("status", { length: 30 }).notNull().default("queued"),
    failureReason: varchar("failure_reason", { length: 500 }),
    retryCount: integer("retry_count").notNull().default(0),
    poolMatchId: uuid("pool_match_id").references(
      () => recruitmentJobPoolMatches.id,
      { onDelete: "set null" }
    ),
    candidateEmailHash: varchar("candidate_email_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    connectorStatusIdx: index("idx_upload_jobs_connector_status").on(
      table.connectorUserId,
      table.status
    ),
    jobIdIdx: index("idx_upload_jobs_job_id").on(table.jobId),
    uniqueJobMedia: unique("unique_upload_job_job_media").on(
      table.jobId,
      table.resumeMediaId
    ),
  })
);

export type RecruitmentUploadJob = typeof recruitmentUploadJobs.$inferSelect;
export type NewRecruitmentUploadJob = typeof recruitmentUploadJobs.$inferInsert;
