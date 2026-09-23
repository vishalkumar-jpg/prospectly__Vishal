import { BadRequestException } from "@nestjs/common";
import type { AssessmentOption } from "database/schema";
import type { AssessmentQuestionType } from "../recruitment-assessment-bank.constants";
import type { CandidateAnswerInput } from "./candidate-response.scorer";
import { ASSESSMENT_BANK_MESSAGES } from "../recruitment-assessment-bank.constants";
import {
  normalizeAssessmentOptionLabels,
  normalizePhase1OptionId,
} from "../recruitment-assessment.util";

/** Minimal question shape needed to validate submitted responses. */
export interface ValidatableQuestion {
  id: string;
  isRequired: boolean;
  questionType: AssessmentQuestionType;
  options: AssessmentOption[] | null;
}

export interface SubmittedResponse {
  jobQuestionId: string;
  answer: CandidateAnswerInput;
}

/** An answer counts as provided when it carries a choice or non-empty text. */
function isAnswered(
  question: ValidatableQuestion,
  answer: CandidateAnswerInput
): boolean {
  if (question.questionType === "text") {
    return !!answer.text && answer.text.trim().length > 0;
  }
  return !!answer.selectedOptionIds && answer.selectedOptionIds.length > 0;
}

function assertValidOptionIds(
  question: ValidatableQuestion,
  answer: CandidateAnswerInput
): void {
  const selected = answer.selectedOptionIds ?? [];
  if (selected.length === 0) return;

  if (question.questionType === "text") {
    throw new BadRequestException(
      ASSESSMENT_BANK_MESSAGES.ERROR.INVALID_OPTION_ANSWER
    );
  }

  const validIds = new Set(
    (normalizeAssessmentOptionLabels(question.options) ?? []).map(
      (option) => option.id
    )
  );
  for (const optionId of selected) {
    if (!validIds.has(normalizePhase1OptionId(optionId))) {
      throw new BadRequestException(
        ASSESSMENT_BANK_MESSAGES.ERROR.INVALID_OPTION_ANSWER
      );
    }
  }
}

/**
 * Validate submitted responses against the job's live questions:
 *  - every `jobQuestionId` must belong to the job
 *  - no duplicate answers for the same question
 *  - selected option ids must belong to that question
 *  - every required question must have a non-empty answer
 *
 * Throws `BadRequestException` on the first violation.
 */
export function validateCandidateResponses(
  questions: ValidatableQuestion[],
  responses: SubmittedResponse[]
): void {
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const seenQuestionIds = new Set<string>();

  for (const response of responses) {
    const question = questionById.get(response.jobQuestionId);
    if (!question) {
      throw new BadRequestException(
        ASSESSMENT_BANK_MESSAGES.ERROR.UNKNOWN_JOB_QUESTION
      );
    }
    // One answer per question — duplicates would collide on the DB unique
    // constraint (job_candidate_id, job_question_id); reject them up front.
    if (seenQuestionIds.has(response.jobQuestionId)) {
      throw new BadRequestException(
        ASSESSMENT_BANK_MESSAGES.ERROR.DUPLICATE_JOB_QUESTION
      );
    }
    seenQuestionIds.add(response.jobQuestionId);
    assertValidOptionIds(question, response.answer);
  }

  const answeredIds = new Set(
    responses
      .filter((response) => {
        const question = questionById.get(response.jobQuestionId);
        return question ? isAnswered(question, response.answer) : false;
      })
      .map((response) => response.jobQuestionId)
  );

  for (const question of questions) {
    if (question.isRequired && !answeredIds.has(question.id)) {
      throw new BadRequestException(
        ASSESSMENT_BANK_MESSAGES.ERROR.REQUIRED_UNANSWERED
      );
    }
  }
}
