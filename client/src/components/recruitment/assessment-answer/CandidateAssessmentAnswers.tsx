import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CandidateAssessmentResponse } from "@/lib/api/recruitment";
import { getAssessmentOptionDisplayLabel } from "@/lib/recruitment/assessment-option-labels";

interface CandidateAssessmentAnswersProps {
  responses: CandidateAssessmentResponse[];
}

/** Map a list of option ids to their labels using the snapshot options. */
function labelsForOptionIds(
  optionIds: string[],
  options: CandidateAssessmentResponse["options"]
): string[] {
  const labelById = new Map(
    (options ?? []).map((o) => [o.id, getAssessmentOptionDisplayLabel(o)])
  );
  return optionIds.map((id) => labelById.get(id) ?? id);
}

/** The candidate's submitted answer as a readable string. */
function formatCandidateAnswer(response: CandidateAssessmentResponse): string {
  if (response.questionType === "text") {
    return response.answer.text?.trim() || "—";
  }
  if (response.answer.selectedLabels?.length) {
    return response.answer.selectedLabels
      .map((label) => getAssessmentOptionDisplayLabel({ id: "", label }))
      .join(", ");
  }
  const ids = response.answer.selectedOptionIds ?? [];
  if (ids.length === 0) return "—";
  return labelsForOptionIds(ids, response.options).join(", ");
}

/** The expected/correct answer as a readable string (choice questions only). */
function formatCorrectAnswer(
  response: CandidateAssessmentResponse
): string | null {
  const ids = response.correctAnswer?.optionIds ?? [];
  if (ids.length === 0) return null;
  return labelsForOptionIds(ids, response.options).join(", ");
}

/**
 * Recruiter-facing read-only view of a candidate's screening answers: each
 * question, the candidate's answer, and a correctness badge.
 */
export function CandidateAssessmentAnswers({
  responses,
}: CandidateAssessmentAnswersProps) {
  if (responses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This candidate has no assessment answers.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {responses.map((response, index) => {
        const correctAnswer = formatCorrectAnswer(response);
        const showExpected = response.isCorrect === false && !!correctAnswer;

        return (
          <div
            key={response.id}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium leading-5">
                <span className="mr-1 font-semibold text-brand-amethyst">
                  {index + 1}.
                </span>
                {response.questionText}
              </p>
              {/* Text answers are informational only — not scored, so no badge. */}
              {response.questionType !== "text" && (
                <CorrectnessBadge isCorrect={response.isCorrect} />
              )}
            </div>

            <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Candidate's answer
              </p>
              <p className="mt-0.5 text-sm">
                {formatCandidateAnswer(response)}
              </p>
            </div>

            {showExpected && (
              <p className="mt-2 text-xs text-muted-foreground">
                Expected answer:{" "}
                <span className="font-medium text-emerald-600">
                  {correctAnswer}
                </span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CorrectnessBadge({ isCorrect }: { isCorrect: boolean | null }) {
  if (isCorrect === true) {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> Correct
      </Badge>
    );
  }
  if (isCorrect === false) {
    return (
      <Badge className="border-red-200 bg-red-50 text-red-700">
        <XCircle className="h-3.5 w-3.5" /> Incorrect
      </Badge>
    );
  }
  return (
    <Badge className="border-slate-200 bg-slate-50 text-slate-600">
      <MinusCircle className="h-3.5 w-3.5" /> Answered
    </Badge>
  );
}

function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        className
      )}
    >
      {children}
    </span>
  );
}
