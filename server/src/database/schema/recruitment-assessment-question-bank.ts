import {
  uuid,
  timestamp,
  integer,
  index,
  text,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { prospectlySchema } from "./schema-definition";
import { users } from "./users";
import { assessmentQuestionTypeEnum } from "./enums";

/**
 * A single answer option for a choice-type assessment question.
 * Options are pure presentation — the correct answer lives in the dedicated
 * `correctAnswer` column, never inside an option (so it is never leaked to
 * candidates when options are rendered).
 */
export interface AssessmentOption {
  id: string; // stable id (not an array index — reorder-safe)
  label: string;
  orderIndex: number;
  value?: number; // stored answer value (Yes -> 1, No -> 0)
}

/**
 * Dedicated answer key. Shape adapts to the question type:
 * - single_choice: `optionIds` with exactly one id
 * - multi_choice:  `optionIds` with one or more ids
 * - text:          `text` with the expected answer / keyword
 * A null column means an informational question with no answer key.
 */
export interface AssessmentCorrectAnswer {
  optionIds?: string[];
  text?: string;
}

/**
 * Per-recruiter reusable question bank. Scoped by `createdBy` (the owner).
 * Adding a bank question to a job COPIES its values into the job question
 * (snapshot) — the bank is never live-referenced at render time.
 */
export const recruitmentAssessmentQuestionBankSchema = prospectlySchema.table(
  "recruitment_assessment_question_bank",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    questionText: text("question_text").notNull(),
    questionType: assessmentQuestionTypeEnum("question_type")
      .notNull()
      .default("single_choice"),
    options: jsonb("options").$type<AssessmentOption[]>(),
    correctAnswer: jsonb("correct_answer").$type<AssessmentCorrectAnswer>(),
    points: integer("points"),
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
    createdByIdx: index(
      "idx_recruitment_assessment_question_bank_created_by"
    ).on(table.createdBy),
  })
);

export type RecruitmentAssessmentQuestionBank =
  typeof recruitmentAssessmentQuestionBankSchema.$inferSelect;
export type NewRecruitmentAssessmentQuestionBank =
  typeof recruitmentAssessmentQuestionBankSchema.$inferInsert;
