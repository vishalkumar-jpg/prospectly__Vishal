import type { AssessmentCorrectAnswer } from "database/schema";
import type { AssessmentQuestionType } from "../recruitment-assessment-bank.constants";

/** Raw candidate answer for a single question. */
export interface CandidateAnswerInput {
  selectedOptionIds?: string[];
  text?: string;
}

/** Minimal question shape needed to score an answer. */
export interface ScorableQuestion {
  questionType: AssessmentQuestionType;
  correctAnswer: AssessmentCorrectAnswer | null;
  points: number | null;
}

export interface AnswerScore {
  isCorrect: boolean;
  pointsAwarded: number;
}

/** Order-independent equality of two option-id lists. */
function sameOptionIds(expected: string[], selected: string[]): boolean {
  if (expected.length !== selected.length) return false;
  const selectedSet = new Set(selected);
  return expected.every((id) => selectedSet.has(id));
}

/**
 * Score a single candidate answer against the question's answer key.
 *
 * Choice questions require an exact match of selected option ids vs the stored
 * `correctAnswer.optionIds` (Phase-1 default: Yes = id `yes` = correct). Text
 * questions are non-blocking in Phase 2 (always correct) — the current authoring
 * UI only produces Yes/No choice questions.
 */
export function scoreChoiceAnswer(
  question: ScorableQuestion,
  answer: CandidateAnswerInput
): AnswerScore {
  const points = question.points ?? 0;

  if (question.questionType === "text") {
    return { isCorrect: true, pointsAwarded: points };
  }

  const expected = question.correctAnswer?.optionIds ?? [];
  const selected = answer.selectedOptionIds ?? [];
  const isCorrect = expected.length > 0 && sameOptionIds(expected, selected);

  return { isCorrect, pointsAwarded: isCorrect ? points : 0 };
}

/**
 * True when no scored answer is explicitly incorrect. An empty set is
 * considered "all correct" (job has no blocking answers). A `null` flag
 * (unknown) is treated as non-blocking.
 */
export function computeAllCorrect(
  rows: Array<{ isCorrect: boolean | null }>
): boolean {
  return rows.every((row) => row.isCorrect !== false);
}
