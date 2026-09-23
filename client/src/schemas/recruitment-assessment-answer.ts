import { z } from "zod";
import type {
  CandidateAssessmentQuestion,
  CandidateAssessmentResponseInput,
} from "@/lib/api/recruitment";

/** A single candidate answer held in local component state. */
export const assessmentAnswerSchema = z.object({
  selectedOptionIds: z.array(z.string()).optional(),
  text: z.string().optional(),
});

export type AssessmentAnswerValue = z.infer<typeof assessmentAnswerSchema>;

/** Local answer state, keyed by `jobQuestionId`. */
export type AssessmentAnswerState = Record<string, AssessmentAnswerValue>;

/** Whether a single answer carries a choice or non-empty text. */
export function isAnswerProvided(answer?: AssessmentAnswerValue): boolean {
  if (!answer) return false;
  if (answer.selectedOptionIds && answer.selectedOptionIds.length > 0) {
    return true;
  }
  return !!answer.text && answer.text.trim().length > 0;
}

/** True when every required question has a non-empty answer. */
export function areRequiredAnswersComplete(
  questions: CandidateAssessmentQuestion[],
  answers: AssessmentAnswerState
): boolean {
  return questions.every(
    (question) => !question.isRequired || isAnswerProvided(answers[question.id])
  );
}

/** Convert local answer state into the API payload (answered questions only). */
export function toAssessmentResponsesPayload(
  questions: CandidateAssessmentQuestion[],
  answers: AssessmentAnswerState
): CandidateAssessmentResponseInput[] {
  const payload: CandidateAssessmentResponseInput[] = [];
  for (const question of questions) {
    const answer = answers[question.id];
    if (!isAnswerProvided(answer)) continue;
    payload.push({
      jobQuestionId: question.id,
      answer: {
        ...(answer?.selectedOptionIds?.length
          ? { selectedOptionIds: answer.selectedOptionIds }
          : {}),
        ...(answer?.text?.trim() ? { text: answer.text.trim() } : {}),
      },
    });
  }
  return payload;
}
