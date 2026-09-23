import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Library, Search, Loader2 } from "lucide-react";
import { useAssessmentBank } from "@/hooks/useAssessmentBank";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { api } from "@/lib/api";
import type {
  AssessmentBankQuestion,
  AssessmentQuestionType,
} from "@/lib/api/recruitment";
import {
  ASSESSMENT_QUESTION_DUPLICATE_IN_BANK,
  ASSESSMENT_QUESTION_DUPLICATE_ON_JOB,
  isDuplicateAssessmentQuestionText,
  normalizeAssessmentQuestionText,
} from "@/lib/recruitment/assessment-question-text";
import {
  ASSESSMENT_AUTHORABLE_TYPES,
  ASSESSMENT_QUESTION_TYPE_REQUIRED,
  getAssessmentQuestionTypeLabel,
} from "@/lib/recruitment/assessment-question-type";
import type { WizardAssessmentQuestion } from "./types";
import { ASSESSMENT_QUESTION_TEXT_MAX } from "./wizard-step-schemas";

/** System primary CTA styling (matches the wizard's publish/save buttons). */
const BRAND_CTA =
  "bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg";

interface AssessmentQuestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  /** The question being edited (edit mode only). */
  editing?: WizardAssessmentQuestion | null;
  /** Questions already on this job (for FE duplicate checks). */
  existingQuestions: WizardAssessmentQuestion[];
  /** Bank question ids already on the job — disabled in the picker. */
  alreadyAddedBankIds: string[];
  /** Called with the new/updated written question. */
  onSaveWritten: (question: WizardAssessmentQuestion) => void;
  /** Called with the bank questions the recruiter chose to add. */
  onAddFromBank: (questions: AssessmentBankQuestion[]) => void;
}

function BankTab({
  existingQuestions,
  alreadyAddedBankIds,
  onAddFromBank,
  onClose,
}: {
  existingQuestions: WizardAssessmentQuestion[];
  alreadyAddedBankIds: string[];
  onAddFromBank: (questions: AssessmentBankQuestion[]) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { questions, loading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAssessmentBank({ search: debouncedSearch });
  const addedSet = useMemo(
    () => new Set(alreadyAddedBankIds),
    [alreadyAddedBankIds]
  );
  const existingTextKeys = useMemo(
    () =>
      new Set(
        existingQuestions.map((q) =>
          normalizeAssessmentQuestionText(q.questionText)
        )
      ),
    [existingQuestions]
  );

  useEffect(() => {
    const root = listContainerRef.current;
    const el = sentinelRef.current;
    if (!root || !el || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root, rootMargin: "120px", threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    questions.length,
    debouncedSearch,
  ]);

  const isBlocked = (q: AssessmentBankQuestion) =>
    addedSet.has(q.id) ||
    existingTextKeys.has(normalizeAssessmentQuestionText(q.questionText));

  const toggle = (id: string) => {
    setError(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const chosen = questions.filter((q) => selectedIds.has(q.id));
    const fresh = chosen.filter((q) => !isBlocked(q));
    if (fresh.length === 0) {
      setError(ASSESSMENT_QUESTION_DUPLICATE_ON_JOB);
      return;
    }
    onAddFromBank(fresh);
    onClose();
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search your questions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div
        ref={listContainerRef}
        className="-mr-1 max-h-[420px] min-h-[260px] space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-color:hsl(var(--muted-foreground)/0.4)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5"
      >
        {loading ? (
          <>
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </>
        ) : questions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm font-medium text-foreground">
              {debouncedSearch
                ? "No questions match your search"
                : "Your question bank is empty"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {debouncedSearch
                ? "Try a different search term."
                : 'Write a question and tick "Save to bank" to reuse it later.'}
            </p>
          </div>
        ) : (
          <>
            {questions.map((q) => {
              const alreadyAdded = isBlocked(q);
              const checked = selectedIds.has(q.id);
              return (
                <label
                  key={q.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    alreadyAdded
                      ? "cursor-not-allowed border-border bg-muted/40 opacity-60"
                      : checked
                        ? "border-brand-amethyst bg-brand-amethyst/5"
                        : "border-border hover:bg-muted/40"
                  }`}
                >
                  <Checkbox
                    checked={alreadyAdded || checked}
                    disabled={alreadyAdded}
                    onCheckedChange={() => !alreadyAdded && toggle(q.id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{q.questionText}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[10px]"
                      >
                        {getAssessmentQuestionTypeLabel(q.questionType)}
                      </Badge>
                      {alreadyAdded && (
                        <span className="text-xs text-muted-foreground">
                          Already added
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
            <div ref={sentinelRef} className="h-4 w-full" aria-hidden />
            {isFetchingNextPage ? (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : null}
          </>
        )}
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter className="items-center gap-2 sm:justify-between">
        <span className="text-xs font-semibold text-brand-amethyst">
          {selectedIds.size} selected
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selectedIds.size === 0}
            className={BRAND_CTA}
          >
            Add {selectedIds.size > 0 ? `${selectedIds.size} ` : ""}
            {selectedIds.size === 1 ? "Question" : "Questions"}
          </Button>
        </div>
      </DialogFooter>
    </div>
  );
}

function WriteTab({
  mode,
  editing,
  existingQuestions,
  onSaveWritten,
  onClose,
}: {
  mode: "add" | "edit";
  editing?: WizardAssessmentQuestion | null;
  existingQuestions: WizardAssessmentQuestion[];
  onSaveWritten: (q: WizardAssessmentQuestion) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(editing?.questionText ?? "");
  // Empty string = no type chosen yet (recruiter must pick one before saving).
  const [type, setType] = useState<AssessmentQuestionType | "">(
    editing?.questionType ?? ""
  );
  const [saveToBank, setSaveToBank] = useState(editing?.saveToBank === true);
  const [error, setError] = useState<string | null>(null);
  const [checkingBank, setCheckingBank] = useState(false);

  // Inline questions (not sourced from the bank) can be promoted to the bank.
  const isInline = !editing?.sourceBankQuestionId;
  const isText = type === "text";

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);

    if (type === "") {
      setError(ASSESSMENT_QUESTION_TYPE_REQUIRED);
      return;
    }

    if (
      isDuplicateAssessmentQuestionText(
        trimmed,
        existingQuestions,
        editing?.clientId
      )
    ) {
      setError(ASSESSMENT_QUESTION_DUPLICATE_ON_JOB);
      return;
    }

    if (isInline && saveToBank) {
      setCheckingBank(true);
      try {
        const { exists } =
          await api.recruitment.assessmentBankQuestionExists(trimmed);
        if (exists) {
          setError(ASSESSMENT_QUESTION_DUPLICATE_IN_BANK);
          return;
        }
      } catch {
        setError("Could not verify question bank. Please try again.");
        return;
      } finally {
        setCheckingBank(false);
      }
    }

    // Text questions carry no options/answer key; the server stamps the default
    // Yes/No set for single_choice, so we clear these on switch and let it re-stamp.
    const typeFields =
      type === "text"
        ? { questionType: type, options: undefined, correctAnswer: undefined }
        : { questionType: type };

    if (editing) {
      onSaveWritten({
        ...editing,
        ...typeFields,
        questionText: trimmed,
        saveToBank: isInline ? saveToBank : editing.saveToBank,
      });
    } else {
      onSaveWritten({
        clientId: crypto.randomUUID(),
        questionText: trimmed,
        isRequired: true,
        saveToBank,
        ...typeFields,
      });
    }
    onClose();
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Textarea
          value={text}
          maxLength={ASSESSMENT_QUESTION_TEXT_MAX}
          rows={5}
          autoFocus
          placeholder="e.g. Are you familiar with Adobe Creative Suite?"
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
        />
        <p className="text-right text-xs text-muted-foreground">
          {text.length} / {ASSESSMENT_QUESTION_TEXT_MAX}
        </p>
      </div>

      {/* Answer type selector (required) */}
      <div className="space-y-1.5">
        <Label
          htmlFor="assessment-answer-type"
          className="text-xs font-medium text-muted-foreground"
        >
          Answer type <span className="text-destructive">*</span>
        </Label>
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v as AssessmentQuestionType);
            if (error) setError(null);
          }}
        >
          <SelectTrigger id="assessment-answer-type">
            <SelectValue placeholder="Select an answer type" />
          </SelectTrigger>
          <SelectContent>
            {ASSESSMENT_AUTHORABLE_TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {type === "single_choice" && (
        <div className="flex flex-wrap items-center gap-2 py-1">
          <span className="text-xs text-muted-foreground">Answer options:</span>
          <Badge className="bg-brand-success text-brand-foreground hover:bg-brand-success">
            Yes
          </Badge>
          <Badge variant="destructive">No</Badge>
        </div>
      )}
      {isText && (
        <p className="py-1 text-xs text-muted-foreground">
          Candidates will type their answer in a text box.
        </p>
      )}

      {isInline && (
        <label className="flex w-fit cursor-pointer items-center gap-2">
          <Checkbox
            checked={saveToBank}
            onCheckedChange={(v) => {
              setSaveToBank(v === true);
              if (error) setError(null);
            }}
          />
          <span className="text-xs text-muted-foreground">
            Save to bank for reuse in future job posts
          </span>
        </label>
      )}

      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={checkingBank}>
          Cancel
        </Button>
        <Button
          onClick={() => void handleSave()}
          disabled={!text.trim() || type === "" || checkingBank}
          className={BRAND_CTA}
        >
          {checkingBank ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking…
            </>
          ) : mode === "edit" ? (
            "Save Changes"
          ) : (
            "Add Question"
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function AssessmentQuestionModal({
  open,
  onOpenChange,
  mode,
  editing,
  existingQuestions,
  alreadyAddedBankIds,
  onSaveWritten,
  onAddFromBank,
}: AssessmentQuestionModalProps) {
  const [tab, setTab] = useState<"write" | "bank">("write");

  // Always land on the Write tab when (re)opening.
  useEffect(() => {
    if (open) setTab("write");
  }, [open]);

  const close = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "edit" ? (
              <Pencil className="h-5 w-5 text-brand-amethyst" />
            ) : (
              <Library className="h-5 w-5 text-brand-amethyst" />
            )}
            {mode === "edit" ? "Edit Question" : "Add Question"}
          </DialogTitle>
          <DialogDescription>
            Add a screening question candidates answer when they apply.
          </DialogDescription>
        </DialogHeader>

        {mode === "edit" ? (
          <WriteTab
            mode="edit"
            editing={editing}
            existingQuestions={existingQuestions}
            onSaveWritten={onSaveWritten}
            onClose={close}
          />
        ) : (
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "write" | "bank")}
          >
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-2xl bg-muted p-1.5">
              <TabsTrigger
                value="write"
                className="gap-2 rounded-xl py-2.5 text-sm font-bold text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-brand-amethyst data-[state=active]:shadow-sm"
              >
                <Pencil className="h-4 w-4" /> Write New
              </TabsTrigger>
              <TabsTrigger
                value="bank"
                className="gap-2 rounded-xl py-2.5 text-sm font-bold text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-brand-amethyst data-[state=active]:shadow-sm"
              >
                <Library className="h-4 w-4" /> From Question Bank
              </TabsTrigger>
            </TabsList>

            <TabsContent value="write" className="mt-4">
              <WriteTab
                mode="add"
                existingQuestions={existingQuestions}
                onSaveWritten={onSaveWritten}
                onClose={close}
              />
            </TabsContent>

            <TabsContent value="bank" className="mt-4">
              <BankTab
                existingQuestions={existingQuestions}
                alreadyAddedBankIds={alreadyAddedBankIds}
                onAddFromBank={onAddFromBank}
                onClose={close}
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
