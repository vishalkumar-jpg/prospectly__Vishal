import * as schema from "database/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import type {
  AssessmentOption,
  AssessmentCorrectAnswer,
} from "database/schema";
import type { AssessmentQuestionType } from "../recruitment-assessment-bank.constants";
import type { DrizzleTx } from "../recruitment-assessment-persistence";
import {
  scoreChoiceAnswer,
  computeAllCorrect,
  type CandidateAnswerInput,
} from "./candidate-response.scorer";
import {
  validateCandidateResponses,
  type SubmittedResponse,
} from "./candidate-response.validator";
import {
  normalizeAssessmentCorrectAnswer,
  normalizeAssessmentOptionLabels,
  normalizePhase1OptionId,
} from "../recruitment-assessment.util";

/** Answer JSON persisted on the response row (matches the schema column type). */
type StoredAnswer = {
  selectedOptionIds?: string[];
  selectedLabels?: string[];
  text?: string;
};

/** A scored, snapshot-ready response row — everything except the candidate id. */
export interface ScoredResponseRow {
  jobQuestionId: string;
  questionTextSnapshot: string;
  questionType: AssessmentQuestionType;
  optionsSnapshot: AssessmentOption[] | null;
  correctAnswerSnapshot: AssessmentCorrectAnswer | null;
  answer: StoredAnswer;
  isCorrect: boolean;
  pointsAwarded: number;
}

function normalizeSubmittedResponses(
  responses: SubmittedResponse[]
): SubmittedResponse[] {
  return responses.map((response) => ({
    ...response,
    answer: {
      ...response.answer,
      selectedOptionIds: response.answer.selectedOptionIds?.map(
        normalizePhase1OptionId
      ),
    },
  }));
}

/** Attach human-readable labels for selected options (recruiter display aid). */
function buildStoredAnswer(
  answer: CandidateAnswerInput,
  options: AssessmentOption[] | null
): StoredAnswer {
  const stored: StoredAnswer = {};
  const normalizedOptions = normalizeAssessmentOptionLabels(options);

  if (answer.selectedOptionIds && answer.selectedOptionIds.length > 0) {
    stored.selectedOptionIds = answer.selectedOptionIds.map(
      normalizePhase1OptionId
    );
    if (normalizedOptions) {
      const labelById = new Map(normalizedOptions.map((o) => [o.id, o.label]));
      const labels = stored.selectedOptionIds
        .map((id) => labelById.get(id))
        .filter((label): label is string => !!label);
      if (labels.length > 0) stored.selectedLabels = labels;
    }
  }

  const text = answer.text?.trim();
  if (text) stored.text = text;

  return stored;
}

/**
 * Load the job's live questions, validate the submitted answers, and score each
 * against the answer key. Pure of candidate identity — no rows are written — so
 * callers that need `allCorrect` before the candidate row exists (e.g. the
 * consent connector-uploaded path) can decide the pipeline stage first.
 */
export async function scoreCandidateResponses(
  tx: DrizzleTx,
  params: { jobId: string; responses: SubmittedResponse[] }
): Promise<{ rows: ScoredResponseRow[]; allCorrect: boolean }> {
  const { jobId } = params;
  const responses = normalizeSubmittedResponses(params.responses);
  const jobQuestions = schema.recruitmentJobAssessmentQuestionsSchema;

  const questions = await tx
    .select()
    .from(jobQuestions)
    .where(and(eq(jobQuestions.jobId, jobId), isNull(jobQuestions.deletedAt)))
    .orderBy(asc(jobQuestions.orderIndex));

  validateCandidateResponses(
    questions.map((q) => ({
      id: q.id,
      isRequired: q.isRequired,
      questionType: q.questionType,
      options: normalizeAssessmentOptionLabels(q.options ?? null),
    })),
    responses
  );

  const questionById = new Map(questions.map((q) => [q.id, q]));
  const rows: ScoredResponseRow[] = [];

  for (const response of responses) {
    const question = questionById.get(response.jobQuestionId);
    if (!question) continue; // validated above; defensive guard

    const options = normalizeAssessmentOptionLabels(question.options ?? null);
    const correctAnswer = normalizeAssessmentCorrectAnswer(
      question.correctAnswer ?? null
    );
    const { isCorrect, pointsAwarded } = scoreChoiceAnswer(
      {
        questionType: question.questionType,
        correctAnswer,
        points: question.points ?? null,
      },
      response.answer
    );

    rows.push({
      jobQuestionId: question.id,
      questionTextSnapshot: question.questionText,
      questionType: question.questionType,
      optionsSnapshot: options,
      correctAnswerSnapshot: correctAnswer,
      answer: buildStoredAnswer(response.answer, options),
      isCorrect,
      pointsAwarded,
    });
  }

  return { rows, allCorrect: computeAllCorrect(rows) };
}

/** Insert already-scored response rows for a candidate (snapshot-on-response). */
export async function insertCandidateResponseRows(
  tx: DrizzleTx,
  params: { candidateId: string; rows: ScoredResponseRow[]; userId: string }
): Promise<void> {
  const { candidateId, rows, userId } = params;
  if (rows.length === 0) return;

  const now = toUTC();
  await tx.insert(schema.recruitmentCandidateAssessmentResponsesSchema).values(
    rows.map((row) => ({
      jobCandidateId: candidateId,
      jobQuestionId: row.jobQuestionId,
      questionTextSnapshot: row.questionTextSnapshot,
      questionType: row.questionType,
      optionsSnapshot: row.optionsSnapshot,
      correctAnswerSnapshot: row.correctAnswerSnapshot,
      answer: row.answer,
      isCorrect: row.isCorrect,
      pointsAwarded: row.pointsAwarded,
      createdBy: userId,
      updatedBy: userId,
      createdAt: now,
      updatedAt: now,
    }))
  );
}

/**
 * Score + persist a candidate's assessment answers in one call. Returns whether
 * every answer was correct (drives Unqualified vs In Review placement).
 * Must run inside the apply transaction, after the candidate row exists.
 */
export async function persistCandidateAssessmentResponses(
  tx: DrizzleTx,
  params: {
    candidateId: string;
    jobId: string;
    responses: SubmittedResponse[];
    userId: string;
  }
): Promise<{ allCorrect: boolean }> {
  const { rows, allCorrect } = await scoreCandidateResponses(tx, {
    jobId: params.jobId,
    responses: params.responses,
  });
  await insertCandidateResponseRows(tx, {
    candidateId: params.candidateId,
    rows,
    userId: params.userId,
  });
  return { allCorrect };
}
