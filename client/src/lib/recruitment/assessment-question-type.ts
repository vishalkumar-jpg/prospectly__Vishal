import type { AssessmentQuestionType } from "@/lib/api/recruitment";

/** Max characters a candidate can type in a text answer (mirrors the server cap). */
export const ASSESSMENT_TEXT_ANSWER_MAX = 500;

/** Shown when a recruiter tries to save a question without choosing an answer type. */
export const ASSESSMENT_QUESTION_TYPE_REQUIRED =
  "Please select an answer type.";

/** Short label for an assessment question's answer type (for badges, summaries). */
export function getAssessmentQuestionTypeLabel(
  type?: AssessmentQuestionType
): string {
  switch (type) {
    case "text":
      return "Text";
    case "multi_choice":
      return "Multiple choice";
    default:
      return "Yes / No";
  }
}

/** Answer type option a recruiter can pick while authoring a question. */
export interface AuthorableAssessmentType {
  value: Extract<AssessmentQuestionType, "single_choice" | "text">;
  label: string;
  hint: string;
}

/**
 * Question types HR can author today. `multi_choice` is supported by the schema
 * but intentionally not exposed here (no options editor yet).
 */
export const ASSESSMENT_AUTHORABLE_TYPES: AuthorableAssessmentType[] = [
  {
    value: "single_choice",
    label: "Yes / No",
    hint: "Candidates answer with Yes or No.",
  },
  {
    value: "text",
    label: "Text answer",
    hint: "Candidates type their answer in a text box.",
  },
];
