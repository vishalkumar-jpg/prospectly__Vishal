import {
  uuid,
  timestamp,
  integer,
  boolean,
  index,
  text,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type {
  AssessmentOption,
  AssessmentCorrectAnswer,
} from "./recruitment-assessment-question-bank";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { recruitmentJobsSchema } from "./recruitment-jobs";
import { recruitmentAssessmentQuestionBankSchema } from "./recruitment-assessment-question-bank";
import { assessmentQuestionTypeEnum } from "./enums";

/**
 * Per-job assessment questions, ordered by `orderIndex` (drag-to-reorder).
 * Each row is SELF-CONTAINED: it stores its own text/options/correctAnswer
 * (copied from the bank or typed inline). Editing a job question is always
 * local — it never affects the bank or any other job.
 * `sourceBankQuestionId` is provenance metadata only, never used for rendering.
 */
export const recruitmentJobAssessmentQuestionsSchema = prospectlySchema.table(
  "recruitment_job_assessment_questions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobId: uuid("job_id")
      .notNull()
      .references(() => recruitmentJobsSchema.id, { onDelete: "cascade" }),
    sourceBankQuestionId: uuid("source_bank_question_id").references(
      () => recruitmentAssessmentQuestionBankSchema.id,
      { onDelete: "set null" }
    ),
    questionText: text("question_text").notNull(),
    questionType: assessmentQuestionTypeEnum("question_type").notNull(),
    options: jsonb("options").$type<AssessmentOption[]>(),
    correctAnswer: jsonb("correct_answer").$type<AssessmentCorrectAnswer>(),
    points: integer("points"),
    orderIndex: integer("order_index").notNull(),
    isRequired: boolean("is_required").notNull().default(true),
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
    jobIdIdx: index("idx_recruitment_job_assessment_questions_job_id").on(
      table.jobId
    ),
    // FK (ON DELETE SET NULL) — index so bank-question deletes don't seq-scan.
    sourceBankQuestionIdIdx: index(
      "idx_recruitment_job_assessment_questions_source_bank_question_id"
    ).on(table.sourceBankQuestionId),
  })
);

export type RecruitmentJobAssessmentQuestion =
  typeof recruitmentJobAssessmentQuestionsSchema.$inferSelect;
export type NewRecruitmentJobAssessmentQuestion =
  typeof recruitmentJobAssessmentQuestionsSchema.$inferInsert;
