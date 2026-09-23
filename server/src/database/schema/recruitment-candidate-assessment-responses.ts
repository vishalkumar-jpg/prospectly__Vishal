import {
  uuid,
  timestamp,
  integer,
  boolean,
  index,
  unique,
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
import { recruitmentJobCandidates } from "./recruitment-job-candidates";
import { recruitmentJobAssessmentQuestionsSchema } from "./recruitment-job-assessment-questions";
import { assessmentQuestionTypeEnum } from "./enums";

/**
 * Candidate answers to a job's assessment questions.
 *
 * Phase 1: SCHEMA ONLY — no read/write API yet. The candidate answering flow
 * lands in Phase 2. Snapshot columns copy the question text/options/answer key
 * at submit time so historical responses stay truthful even if the underlying
 * job question is later edited or deleted.
 */
export const recruitmentCandidateAssessmentResponsesSchema =
  prospectlySchema.table(
    "recruitment_candidate_assessment_responses",
    {
      id: uuid("id")
        .primaryKey()
        .default(sql`gen_random_uuid()`),
      jobCandidateId: uuid("job_candidate_id")
        .notNull()
        .references(() => recruitmentJobCandidates.id, { onDelete: "cascade" }),
      jobQuestionId: uuid("job_question_id").references(
        () => recruitmentJobAssessmentQuestionsSchema.id,
        { onDelete: "set null" }
      ),
      questionTextSnapshot: text("question_text_snapshot").notNull(),
      questionType: assessmentQuestionTypeEnum("question_type").notNull(),
      optionsSnapshot: jsonb("options_snapshot").$type<AssessmentOption[]>(),
      correctAnswerSnapshot: jsonb(
        "correct_answer_snapshot"
      ).$type<AssessmentCorrectAnswer>(),
      answer: jsonb("answer")
        .$type<{
          selectedOptionIds?: string[];
          selectedLabels?: string[];
          text?: string;
        }>()
        .notNull(),
      isCorrect: boolean("is_correct"),
      pointsAwarded: integer("points_awarded"),
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
      jobCandidateIdIdx: index(
        "idx_recruitment_candidate_assessment_responses_job_candidate_id"
      ).on(table.jobCandidateId),
      // FK (ON DELETE SET NULL) — index so job-question deletes don't seq-scan.
      jobQuestionIdIdx: index(
        "idx_recruitment_candidate_assessment_responses_job_question_id"
      ).on(table.jobQuestionId),
      uniqueCandidateQuestion: unique(
        "unique_recruitment_candidate_assessment_response"
      ).on(table.jobCandidateId, table.jobQuestionId),
    })
  );

export type RecruitmentCandidateAssessmentResponse =
  typeof recruitmentCandidateAssessmentResponsesSchema.$inferSelect;
export type NewRecruitmentCandidateAssessmentResponse =
  typeof recruitmentCandidateAssessmentResponsesSchema.$inferInsert;
