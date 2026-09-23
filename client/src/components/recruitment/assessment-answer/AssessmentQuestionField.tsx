import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CandidateAssessmentQuestion } from "@/lib/api/recruitment";
import type { AssessmentAnswerValue } from "@/schemas/recruitment-assessment-answer";
import { getAssessmentOptionDisplayLabel } from "@/lib/recruitment/assessment-option-labels";
import { ASSESSMENT_TEXT_ANSWER_MAX } from "@/lib/recruitment/assessment-question-type";

interface AssessmentQuestionFieldProps {
  index: number;
  question: CandidateAssessmentQuestion;
  value?: AssessmentAnswerValue;
  onChange: (value: AssessmentAnswerValue) => void;
}

/** Renders a single assessment question with the input for its type. */
export function AssessmentQuestionField({
  index,
  question,
  value,
  onChange,
}: AssessmentQuestionFieldProps) {
  const options = question.options ?? [];
  const selectedIds = value?.selectedOptionIds ?? [];
  const fieldId = `assessment-q-${question.id}`;

  const toggleMulti = (optionId: string, checked: boolean) => {
    const next = checked
      ? [...selectedIds, optionId]
      : selectedIds.filter((id) => id !== optionId);
    onChange({ selectedOptionIds: next });
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-start gap-2">
        <span className="text-sm font-semibold text-brand-amethyst">
          {index + 1}.
        </span>
        <p id={`${fieldId}-label`} className="text-sm font-medium leading-5">
          {question.questionText}
          {question.isRequired && (
            <span className="ml-1 text-destructive" aria-hidden>
              *
            </span>
          )}
        </p>
      </div>

      {question.questionType === "text" ? (
        <div className="space-y-1">
          <Textarea
            id={fieldId}
            aria-labelledby={`${fieldId}-label`}
            rows={3}
            maxLength={ASSESSMENT_TEXT_ANSWER_MAX}
            value={value?.text ?? ""}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Type your answer..."
          />
          <p className="text-right text-xs text-muted-foreground">
            {(value?.text ?? "").length} / {ASSESSMENT_TEXT_ANSWER_MAX}
          </p>
        </div>
      ) : question.questionType === "multi_choice" ? (
        <div className="space-y-2">
          {options.map((option) => {
            const checked = selectedIds.includes(option.id);
            return (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                  checked
                    ? "border-brand-amethyst bg-brand-amethyst/5"
                    : "hover:bg-muted/50"
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) =>
                    toggleMulti(option.id, next === true)
                  }
                />
                <span>{getAssessmentOptionDisplayLabel(option)}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <RadioGroup
          value={selectedIds[0] ?? ""}
          onValueChange={(optionId) =>
            onChange({ selectedOptionIds: [optionId] })
          }
          className="grid grid-cols-2 gap-2"
        >
          {options.map((option) => {
            const checked = selectedIds[0] === option.id;
            const optionId = `${fieldId}-${option.id}`;
            return (
              <Label
                key={option.id}
                htmlFor={optionId}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-normal transition-colors",
                  checked
                    ? "border-brand-amethyst bg-brand-amethyst/5"
                    : "hover:bg-muted/50"
                )}
              >
                <RadioGroupItem id={optionId} value={option.id} />
                <span>{getAssessmentOptionDisplayLabel(option)}</span>
              </Label>
            );
          })}
        </RadioGroup>
      )}
    </div>
  );
}
