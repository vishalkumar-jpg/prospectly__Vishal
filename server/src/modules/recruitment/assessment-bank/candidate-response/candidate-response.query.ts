import * as schema from "database/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  AssessmentOption,
  AssessmentCorrectAnswer,
} from "database/schema";
import type { AssessmentQuestionType } from "../recruitment-assessment-bank.constants";
import {
  toCandidateAssessmentQuestion,
  type CandidateAssessmentQuestion,
} from "../recruitment-assessment.util";

/**
 * Fetch a job's candidate-facing assessment questions — ordered by
 * `orderIndex`, non-deleted, with the answer key (`correctAnswer`) stripped.
 * Shared by every candidate-facing surface (public job page, consent verify) so
 * the key is never exposed.
 */
export async function fetchCandidateAssessmentQuestions(
  db: PostgresJsDatabase<typeof schema>,
  jobId: string
): Promise<CandidateAssessmentQuestion[]> {
  const jobQuestions = schema.recruitmentJobAssessmentQuestionsSchema;
  const rows = await db
    .select()
    .from(jobQuestions)
    .where(and(eq(jobQuestions.jobId, jobId), isNull(jobQuestions.deletedAt)))
    .orderBy(asc(jobQuestions.orderIndex));

  return rows.map(toCandidateAssessmentQuestion);
}

/**
 * A candidate's stored answer to one assessment question, for the recruiter-facing
 * Candidate Detail view. Includes the answer key snapshot (recruiter-only surface).
 */
export interface CandidateAssessmentResponseView {
  id: string;
  jobQuestionId: string | null;
  questionText: string;
  questionType: AssessmentQuestionType;
  options: AssessmentOption[] | null;
  correctAnswer: AssessmentCorrectAnswer | null;
  answer: {
    selectedOptionIds?: string[];
    selectedLabels?: string[];
    text?: string;
  };
  isCorrect: boolean | null;
  pointsAwarded: number | null;
  orderIndex: number;
}

/**
 * Fetch a candidate's assessment answers (snapshots) for the recruiter Candidate
 * Detail popup, ordered by the recruiter's question order. Joins the live job
 * question only for `orderIndex`; answers themselves come from the immutable
 * snapshots so history stays truthful even if a question was later edited/deleted.
 */
export async function fetchCandidateAssessmentResponses(
  db: PostgresJsDatabase<typeof schema>,
  candidateId: string
): Promise<CandidateAssessmentResponseView[]> {
  const responses = schema.recruitmentCandidateAssessmentResponsesSchema;
  const questions = schema.recruitmentJobAssessmentQuestionsSchema;

  const rows = await db
    .select({
      id: responses.id,
      jobQuestionId: responses.jobQuestionId,
      questionText: responses.questionTextSnapshot,
      questionType: responses.questionType,
      options: responses.optionsSnapshot,
      correctAnswer: responses.correctAnswerSnapshot,
      answer: responses.answer,
      isCorrect: responses.isCorrect,
      pointsAwarded: responses.pointsAwarded,
      orderIndex: questions.orderIndex,
    })
    .from(responses)
    .leftJoin(questions, eq(responses.jobQuestionId, questions.id))
    .where(
      and(
        eq(responses.jobCandidateId, candidateId),
        isNull(responses.deletedAt)
      )
    )
    .orderBy(asc(questions.orderIndex), asc(responses.createdAt));

  return rows.map((row) => ({
    id: row.id,
    jobQuestionId: row.jobQuestionId,
    questionText: row.questionText,
    questionType: row.questionType,
    options: row.options ?? null,
    correctAnswer: row.correctAnswer ?? null,
    answer: row.answer,
    isCorrect: row.isCorrect,
    pointsAwarded: row.pointsAwarded,
    // Deleted questions (null join) sort last but keep a stable numeric order.
    orderIndex: row.orderIndex ?? Number.MAX_SAFE_INTEGER,
  }));
}
