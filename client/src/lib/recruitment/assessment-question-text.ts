/**
 * Canonical comparison for assessment question text.
 * Case-insensitive; collapses internal whitespace.
 */
export function normalizeAssessmentQuestionText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isDuplicateAssessmentQuestionText(
  candidate: string,
  existing: Array<{ questionText: string; clientId?: string }>,
  excludeClientId?: string
): boolean {
  const key = normalizeAssessmentQuestionText(candidate);
  if (!key) return false;
  return existing.some(
    (q) =>
      q.clientId !== excludeClientId &&
      normalizeAssessmentQuestionText(q.questionText) === key
  );
}

export const ASSESSMENT_QUESTION_DUPLICATE_ON_JOB =
  "This question is already added to this job.";

export const ASSESSMENT_QUESTION_DUPLICATE_IN_BANK =
  "This question already exists in your question bank.";
