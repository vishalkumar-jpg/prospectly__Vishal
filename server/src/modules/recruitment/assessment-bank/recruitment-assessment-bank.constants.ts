import type { AssessmentOption } from "database/schema";

/** Question types the schema supports. Phase-1 UI uses `single_choice` only. */
export const ASSESSMENT_QUESTION_TYPES = [
  "single_choice",
  "multi_choice",
  "text",
] as const;

export type AssessmentQuestionType = (typeof ASSESSMENT_QUESTION_TYPES)[number];

/** Choice-type question types (i.e. everything except free `text`). */
export const CHOICE_QUESTION_TYPES: AssessmentQuestionType[] = [
  "single_choice",
  "multi_choice",
];

/**
 * Fixed Yes / No option set applied to every question in Phase 1.
 * Recruiters do not edit options yet; the schema/DTO still accept arbitrary
 * options so future phases can add Multiple Choice / Open Text with no change.
 */
export const DEFAULT_ASSESSMENT_OPTIONS: AssessmentOption[] = [
  { id: "yes", label: "Yes", orderIndex: 0, value: 1 },
  { id: "no", label: "No", orderIndex: 1, value: 0 },
];

/** Legacy Phase-1 option ids → current Yes/No ids. */
export const LEGACY_ASSESSMENT_OPTION_ID_MAP: Record<string, string> = {
  approve: "yes",
  decline: "no",
};

export const QUESTION_TEXT_MIN = 1;
export const QUESTION_TEXT_MAX = 500;
export const OPTION_LABEL_MAX = 255;
export const OPTION_ID_MAX = 64;
export const MAX_OPTIONS_PER_QUESTION = 10;
export const MIN_OPTIONS_PER_CHOICE = 2;
export const MAX_QUESTIONS_PER_JOB = 30;

export const ASSESSMENT_BANK_MESSAGES = {
  ERROR: {
    NOT_FOUND: "Assessment question not found",
    UNAUTHORIZED: "You are not authorized to modify this question",
    TOO_MANY_QUESTIONS: `A job can have at most ${MAX_QUESTIONS_PER_JOB} assessment questions`,
    CHOICE_NEEDS_OPTIONS: `Choice questions need at least ${MIN_OPTIONS_PER_CHOICE} options`,
    TEXT_HAS_OPTIONS: "Text questions cannot have options",
    CORRECT_OPTION_UNKNOWN:
      "Correct answer references an option that does not exist",
    CHOICE_NEEDS_CORRECT_ANSWER:
      "Choice questions must have at least one correct answer",
    // Candidate answering flow (Phase 2)
    REQUIRED_UNANSWERED: "Please answer all required assessment questions",
    INVALID_OPTION_ANSWER:
      "One or more answers reference an option that is not valid for that question",
    UNKNOWN_JOB_QUESTION:
      "An answer references a question that is not part of this job",
    DUPLICATE_JOB_QUESTION:
      "A question was answered more than once in this submission",
    DUPLICATE_QUESTION_ON_JOB: "This question is already added to this job",
    DUPLICATE_BANK_QUESTION:
      "This question already exists in your question bank",
  },
  SUCCESS: {
    CREATED: "Assessment question created successfully",
    UPDATED: "Assessment question updated successfully",
    DELETED: "Assessment question deleted successfully",
  },
} as const;
