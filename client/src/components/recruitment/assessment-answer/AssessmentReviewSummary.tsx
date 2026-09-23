import type { CandidateAssessmentQuestion } from "@/lib/api/recruitment";
import type { AssessmentAnswerState } from "@/schemas/recruitment-assessment-answer";
import { getAssessmentOptionDisplayLabel } from "@/lib/recruitment/assessment-option-labels";

interface AssessmentReviewSummaryProps {
  questions: CandidateAssessmentQuestion[];
  answers: AssessmentAnswerState;
}

/** Read-only recap of the candidate's answers for the Review & Submit step. */
export function AssessmentReviewSummary({
  questions,
  answers,
}: AssessmentReviewSummaryProps) {
  if (questions.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Screening answers
      </p>
      <ul className="space-y-2">
        {questions.map((question, index) => (
          <li key={question.id} className="rounded-md border bg-muted/30 p-3">
            <p className="text-sm font-medium leading-5">
              {index + 1}. {question.questionText}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatAnswer(question, answers)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatAnswer(
  question: CandidateAssessmentQuestion,
  answers: AssessmentAnswerState
): string {
  const answer = answers[question.id];
  if (!answer) return "—";

  if (question.questionType === "text") {
    return answer.text?.trim() || "—";
  }

  const selectedIds = answer.selectedOptionIds ?? [];
  if (selectedIds.length === 0) return "—";

  const labelById = new Map(
    (question.options ?? []).map((option) => [
      option.id,
      getAssessmentOptionDisplayLabel(option),
    ])
  );
  const labels = selectedIds.map((id) => labelById.get(id) ?? id);
  return labels.join(", ");
}
