import {
  uuid,
  varchar,
  timestamp,
  integer,
  bigint,
  index,
  unique,
  numeric,
  jsonb,
  text,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { recruitmentJobsSchema } from "./recruitment-jobs";
import { recruitmentJobShares } from "./recruitment-job-shares";
import { recruitmentStagesSchema } from "./recruitment-stages";
import { mediaSchema } from "./media.schema";
import { contacts } from "./contacts";

export const recruitmentJobCandidates = prospectlySchema.table(
  "recruitment_job_candidates",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobId: uuid("job_id")
      .notNull()
      .references(() => recruitmentJobsSchema.id, { onDelete: "cascade" }),
    candidateUserId: uuid("candidate_user_id")
      .notNull()
      .references(() => users.id),
    shareId: uuid("share_id").references(() => recruitmentJobShares.id, {
      onDelete: "set null",
    }),
    sharerCode: varchar("sharer_code", { length: 50 }),
    stageId: integer("stage_id").references(() => recruitmentStagesSchema.id),
    linkedinUrl: varchar("linkedin_url", { length: 255 }),
    resumeMediaId: uuid("resume_media_id").references(() => mediaSchema.id),
    contactId: bigint("contact_id", { mode: "number" }).references(
      () => contacts.id
    ),
    anonymousLabel: varchar("anonymous_label", { length: 50 }),
    stageUpdatedAt: timestamp("stage_updated_at", { withTimezone: true }),
    // Skill matching fields
    matchScore: numeric("match_score", { precision: 5, scale: 2 }),
    matchedSkills: jsonb("matched_skills"),
    missingSkills: jsonb("missing_skills"),
    analysisAt: timestamp("analysis_at", { withTimezone: true }),
    analysisStatus: varchar("analysis_status", { length: 20 }),
    analysisNote: text("analysis_note"),
    // Human-readable reason a candidate was routed to the `not_qualified` stage
    // (e.g. low AI score and/or failed screening). Null for qualified candidates.
    notQualifiedReason: text("not_qualified_reason"),
    gapAnalysis: jsonb("gap_analysis"),
    evaluationRetryCount: integer("evaluation_retry_count")
      .notNull()
      .default(0),
    // Recruiter-supplied date the candidate started; basis for probation_end.
    // (Note: the system-clock "moved to Hired" timestamp is derivable from
    // recruitment_candidate_stage_history — no denormalized column needed.)
    hireDate: timestamp("hire_date", { withTimezone: true }),
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
    jobIdIdx: index("idx_recruitment_job_candidates_job_id").on(table.jobId),
    candidateUserIdIdx: index(
      "idx_recruitment_job_candidates_candidate_user_id"
    ).on(table.candidateUserId),
    stageIdIdx: index("idx_recruitment_job_candidates_stage_id").on(
      table.stageId
    ),
    shareIdIdx: index("idx_recruitment_job_candidates_share_id").on(
      table.shareId
    ),
    uniqueJobCandidate: unique("unique_recruitment_job_candidate_user").on(
      table.jobId,
      table.candidateUserId
    ),
  })
);

export type RecruitmentJobCandidate =
  typeof recruitmentJobCandidates.$inferSelect;
export type NewRecruitmentJobCandidate =
  typeof recruitmentJobCandidates.$inferInsert;
