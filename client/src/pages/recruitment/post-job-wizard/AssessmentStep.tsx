import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SortableList } from "@/components/ui/sortable-list";
import {
  Plus,
  Library,
  Trash2,
  Pencil,
  ClipboardList,
  Info,
} from "lucide-react";
import type { JobFormData, UpdateJobFormData } from "./types";
import type { WizardAssessmentQuestion } from "./types";
import type { AssessmentBankQuestion } from "@/lib/api/recruitment";
import type { StepErrors } from "./validation";
import { getAssessmentQuestionTypeLabel } from "@/lib/recruitment/assessment-question-type";
import AssessmentQuestionModal from "./AssessmentQuestionModal";

/** System primary CTA styling (matches the wizard's publish/save buttons). */
const BRAND_CTA =
  "bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg";

interface AssessmentStepProps {
  formData: JobFormData;
  updateFormData: UpdateJobFormData;
  readOnly?: boolean;
  stepErrors: StepErrors;
}

function fromBankQuestion(q: AssessmentBankQuestion): WizardAssessmentQuestion {
  return {
    clientId: crypto.randomUUID(),
    sourceBankQuestionId: q.id,
    questionText: q.questionText,
    isRequired: true,
    questionType: q.questionType,
    options: q.options ?? undefined,
    correctAnswer: q.correctAnswer ?? undefined,
    points: q.points ?? undefined,
  };
}

export default function AssessmentStep({
  formData,
  updateFormData,
  readOnly = false,
  stepErrors,
}: AssessmentStepProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editing, setEditing] = useState<WizardAssessmentQuestion | null>(null);

  const questions = formData.assessmentQuestions;
  const error = stepErrors.assessmentQuestions;

  const setQuestions = (
    next:
      | WizardAssessmentQuestion[]
      | ((prev: WizardAssessmentQuestion[]) => WizardAssessmentQuestion[])
  ) => {
    updateFormData((prev) => ({
      assessmentQuestions:
        typeof next === "function" ? next(prev.assessmentQuestions) : next,
    }));
  };

  const toggleEnabled = (enabled: boolean) => {
    updateFormData({ hasAssessment: enabled });
  };

  const upsertQuestion = (q: WizardAssessmentQuestion) => {
    setQuestions((prev) => {
      const i = prev.findIndex((x) => x.clientId === q.clientId);
      if (i === -1) return [...prev, q];
      const next = [...prev];
      next[i] = q;
      return next;
    });
  };

  const removeQuestion = (clientId: string) => {
    setQuestions((prev) => prev.filter((q) => q.clientId !== clientId));
  };

  const addFromBank = (bankQuestions: AssessmentBankQuestion[]) => {
    setQuestions((prev) => [...prev, ...bankQuestions.map(fromBankQuestion)]);
  };

  const openAdd = () => {
    setModalMode("add");
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (q: WizardAssessmentQuestion) => {
    if (readOnly) return;
    setModalMode("edit");
    setEditing(q);
    setModalOpen(true);
  };

  const alreadyAddedBankIds = questions
    .map((q) => q.sourceBankQuestionId)
    .filter((id): id is string => !!id);

  return (
    <div className="space-y-6">
      <div className="text-left">
        <h2 className="flex items-center gap-2 text-2xl font-extrabold text-foreground">
          <ClipboardList className="h-6 w-6 text-brand-amethyst" />
          Assessment Questions
        </h2>
        <p className="mt-2 text-muted-foreground">
          Optionally add screening questions candidates answer when they apply.
          You can add, reorder, edit, or remove them anytime.
        </p>
      </div>

      {/* Enable toggle */}
      <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
        <Checkbox
          checked={formData.hasAssessment}
          disabled={readOnly}
          onCheckedChange={(v) => toggleEnabled(v === true)}
          className="mt-0.5"
        />
        <div>
          <span className="text-sm font-semibold text-foreground">
            This job has an assessment
          </span>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Turn this on to add screening questions to this job post.
          </p>
        </div>
      </label>

      {formData.hasAssessment && (
        <div className="space-y-4">
          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="secondary" className="shrink-0">
              {questions.length}{" "}
              {questions.length === 1 ? "question" : "questions"}
            </Badge>
            {!readOnly && (
              <Button
                type="button"
                onClick={openAdd}
                className={`gap-2 ${BRAND_CTA}`}
              >
                <Plus className="h-4 w-4" /> Add Question
              </Button>
            )}
          </div>

          {questions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">
                No questions yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use &quot;Add Question&quot; to write one or pick from your
                bank.
              </p>
            </div>
          ) : (
            <div className="-mr-1 max-h-[24rem] overflow-y-auto overscroll-contain pr-1 [scrollbar-color:hsl(var(--muted-foreground)/0.4)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
              <SortableList
                items={questions}
                getId={(q) => q.clientId}
                onReorder={(next) => setQuestions(next)}
                disabled={readOnly}
                renderItem={(q, dragHandle, index) => (
                  <div
                    className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:bg-muted/40"
                    onClick={() => openEdit(q)}
                    role="button"
                  >
                    <span
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                    >
                      {dragHandle}
                    </span>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {q.questionText.trim() || (
                        <span className="italic text-muted-foreground">
                          Untitled question…
                        </span>
                      )}
                    </span>
                    <Badge
                      variant="secondary"
                      className="hidden shrink-0 text-[10px] sm:inline-flex"
                    >
                      {getAssessmentQuestionTypeLabel(q.questionType)}
                    </Badge>
                    {q.sourceBankQuestionId && (
                      <Badge
                        variant="secondary"
                        className="hidden shrink-0 gap-1 text-[10px] sm:inline-flex"
                      >
                        <Library className="h-3 w-3" /> Bank
                      </Badge>
                    )}
                    {!readOnly && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Edit question"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(q);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove question"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeQuestion(q.clientId);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              />
            </div>
          )}

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Candidates answer these while applying. You can change these
            questions later from the job&apos;s edit page.
          </p>
        </div>
      )}

      <AssessmentQuestionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        editing={editing}
        existingQuestions={questions}
        alreadyAddedBankIds={alreadyAddedBankIds}
        onSaveWritten={upsertQuestion}
        onAddFromBank={addFromBank}
      />
    </div>
  );
}
