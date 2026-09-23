import { uuid, varchar, timestamp, integer, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { recruitmentJobCandidates } from "./recruitment-job-candidates";
import { recruitmentStagesSchema } from "./recruitment-stages";

export const recruitmentCandidateStageHistory = prospectlySchema.table(
  "recruitment_candidate_stage_history",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => recruitmentJobCandidates.id, { onDelete: "cascade" }),
    stageId: integer("stage_id").references(() => recruitmentStagesSchema.id),
    note: varchar("note", { length: 500 }),
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
    candidateIdIdx: index(
      "idx_recruitment_candidate_stage_history_candidate_id"
    ).on(table.candidateId),
    stageIdIdx: index("idx_recruitment_candidate_stage_history_stage_id").on(
      table.stageId
    ),
  })
);

export type RecruitmentCandidateStageHistory =
  typeof recruitmentCandidateStageHistory.$inferSelect;
export type NewRecruitmentCandidateStageHistory =
  typeof recruitmentCandidateStageHistory.$inferInsert;
