import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Award, Info, Lock } from "lucide-react";
import { useCallback, type KeyboardEvent } from "react";
import type { JobFormData, UpdateJobFormData } from "./types";
import { getStepFieldError, type StepErrors } from "./validation";
import { BLOCKED_KEYS, PROBATION_MAX_DAYS, SUCCESS_FEE_MAX } from "./constants";
import { handleNumberInputWheel } from "./numberInputWheel";
import { cn } from "@/lib/utils";
import {
  clampFormattedDecimal,
  formatMoneyWithCommas,
} from "@/lib/formatted-decimal";
import { useDecimalAmountInput } from "./useDecimalAmountInput";

interface SuccessFeesStepProps {
  formData: JobFormData;
  updateFormData: UpdateJobFormData;
  isEditMode?: boolean;
  readOnly?: boolean;
  /** Unlocks the editable view on the edit page (Phase 2 Success Fee edit). */
  successFeeEditable?: boolean;
  storedHasSuccessFee?: boolean | null;
  storedSuccessFeeAmount?: string | null;
  storedProbationPeriodDays?: number | null;
  stepErrors?: StepErrors;
  onUpdateStepFieldError?: (field: string, message: string | undefined) => void;
}

function SuccessFeesLockedView({
  storedHasSuccessFee,
  storedSuccessFeeAmount,
  storedProbationPeriodDays,
}: {
  storedHasSuccessFee?: boolean | null;
  storedSuccessFeeAmount?: string | null;
  storedProbationPeriodDays?: number | null;
}) {
  const wasApplied =
    storedHasSuccessFee === true &&
    storedSuccessFeeAmount != null &&
    storedSuccessFeeAmount !== "";
  const hasProbation =
    storedProbationPeriodDays != null && Number(storedProbationPeriodDays) > 0;

  return (
    <div className="space-y-6">
      <div className="mb-4 text-left sm:mb-6 lg:mb-8">
        <h2 className="text-2xl font-extrabold text-foreground">
          Success Fees
          <Badge variant="secondary" className="ml-2 align-middle text-xs">
            <Lock className="mr-1 h-3 w-3" />
            Read-only
          </Badge>
        </h2>
        <p className="mt-2 text-muted-foreground">
          This is the optional one-time bonus you offered the person you hire.
          You chose this when you posted the job, so it can’t be changed now.
        </p>
      </div>

      <div className="w-full space-y-4">
        {wasApplied ? (
          <>
            {/* Plain-language explainer so a first-time reader understands it. */}
            <div className="flex items-start gap-2.5 rounded-xl bg-brand-amethyst/10 p-3.5 text-[13px] leading-relaxed text-brand-amethyst">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                A success fee is a{" "}
                <b className="font-semibold">
                  one-time bonus paid to the candidate you hire
                </b>
                {hasProbation
                  ? ` — released after they’ve stayed ${storedProbationPeriodDays} days on the job, so the bonus rewards people who stick around.`
                  : ", paid once you mark them as hired."}
              </p>
            </div>

            <Card className="rounded-2xl border border-border shadow-brand-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="h-5 w-5 text-brand-amethyst" />
                  Success Fee
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div
                    className={cn(
                      "flex items-center justify-between",
                      hasProbation ? "border-b border-border pb-3" : ""
                    )}
                  >
                    <span className="text-sm text-muted-foreground">
                      Bonus for the hired candidate
                    </span>
                    <span className="font-semibold text-foreground">
                      ${formatMoneyWithCommas(Number(storedSuccessFeeAmount))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      When it’s paid
                    </span>
                    <span className="font-semibold text-foreground">
                      {hasProbation
                        ? `After ${storedProbationPeriodDays} days on the job`
                        : "Once the candidate is hired"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="rounded-2xl border border-border shadow-brand-card">
            <CardContent className="flex items-start gap-3 p-5">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  No success fee on this job
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  You chose not to offer a one-time bonus to the candidate you
                  hire for this role.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function refreshSuccessFeesFieldErrors({
  formData,
  next,
  onUpdateStepFieldError,
}: {
  formData: JobFormData;
  next: Partial<JobFormData>;
  onUpdateStepFieldError?: (field: string, message: string | undefined) => void;
}): void {
  const prospective = { ...formData, ...next };
  const fields = ["successFeeAmount", "probationPeriodDays"] as const;

  for (const field of fields) {
    onUpdateStepFieldError?.(
      field,
      getStepFieldError("successFees", field, prospective)
    );
  }
}

function useSuccessFeesEditableHandlers({
  formData,
  updateFormData,
  onUpdateStepFieldError,
}: {
  formData: JobFormData;
  updateFormData: UpdateJobFormData;
  onUpdateStepFieldError?: (field: string, message: string | undefined) => void;
}) {
  const blockInvalidKeys = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (BLOCKED_KEYS.includes(e.key)) e.preventDefault();
  }, []);

  const refreshFieldErrors = useCallback(
    (next: Partial<JobFormData>) => {
      refreshSuccessFeesFieldErrors({ formData, next, onUpdateStepFieldError });
    },
    [formData, onUpdateStepFieldError]
  );

  const handleToggle = useCallback(
    (checked: boolean) => {
      updateFormData({ hasSuccessFee: checked });
      if (!checked) {
        onUpdateStepFieldError?.("successFeeAmount", undefined);
        onUpdateStepFieldError?.("probationPeriodDays", undefined);
        return;
      }
      refreshFieldErrors({ hasSuccessFee: true });
    },
    [updateFormData, onUpdateStepFieldError, refreshFieldErrors]
  );

  const handleAmountChange = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed === "") {
        updateFormData({ successFeeAmount: 0 });
        refreshFieldErrors({ successFeeAmount: 0 });
        return;
      }
      const value = clampFormattedDecimal(raw, SUCCESS_FEE_MAX);
      if (value === null) return;
      updateFormData({ successFeeAmount: value });
      refreshFieldErrors({ successFeeAmount: value });
    },
    [updateFormData, refreshFieldErrors]
  );

  const handleProbationChange = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed === "") {
        updateFormData({ probationPeriodDays: 0 });
        refreshFieldErrors({ probationPeriodDays: 0 });
        return;
      }
      const parsed = parseInt(trimmed, 10);
      const numeric = Number.isFinite(parsed) ? parsed : 0;
      const value = Math.min(PROBATION_MAX_DAYS, Math.max(0, numeric));
      updateFormData({ probationPeriodDays: value });
      refreshFieldErrors({ probationPeriodDays: value });
    },
    [updateFormData, refreshFieldErrors]
  );

  return {
    blockInvalidKeys,
    handleToggle,
    handleAmountChange,
    handleProbationChange,
  };
}

function SuccessFeesEditableView({
  formData,
  stepErrors,
  isEditContext = false,
  blockInvalidKeys,
  handleToggle,
  handleAmountChange,
  handleProbationChange,
}: {
  formData: JobFormData;
  stepErrors: StepErrors;
  isEditContext?: boolean;
  blockInvalidKeys: (e: KeyboardEvent<HTMLInputElement>) => void;
  handleToggle: (checked: boolean) => void;
  handleAmountChange: (raw: string) => void;
  handleProbationChange: (raw: string) => void;
}) {
  const amountError = stepErrors.successFeeAmount;
  const probationError = stepErrors.probationPeriodDays;

  const amountInput = useDecimalAmountInput({
    value: formData.successFeeAmount,
    onChange: handleAmountChange,
  });

  return (
    <div className="space-y-6">
      <div className="mb-4 text-left sm:mb-6 lg:mb-8">
        <h2 className="text-2xl font-extrabold text-foreground">
          Success Fees
        </h2>
        <p className="mt-2 text-muted-foreground">
          Optionally offer a one-time bonus to the hired candidate, payable
          after a probation window.
        </p>
      </div>

      <div className="w-full space-y-6">
        {!isEditContext && (
          <div className="flex items-start gap-2 rounded-lg bg-brand-amethyst/10 p-3 text-xs text-brand-amethyst">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              They will be shown on the public job page so candidates can see
              the bonus before applying.
            </p>
          </div>
        )}

        <Card
          className={cn(
            "rounded-2xl border-2 shadow-brand-card transition-colors duration-200",
            formData.hasSuccessFee
              ? "border-brand-amethyst/30"
              : "border-border"
          )}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5 text-brand-amethyst" />
              Success Fee
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex cursor-pointer select-none items-start gap-3">
              <Checkbox
                checked={formData.hasSuccessFee}
                onCheckedChange={(checked) => handleToggle(checked === true)}
                id="success-fee-toggle"
                className="mt-0.5"
              />
              <span className="text-sm leading-snug text-foreground">
                Do you want to apply Success Fees to candidates?
              </span>
            </label>

            {isEditContext && (
              <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Changes apply to every un-released candidate bonus, which is
                  always paid the latest amount. Turning this off stops future
                  bonuses; candidates already charged keep theirs.
                </p>
              </div>
            )}

            {formData.hasSuccessFee && (
              <div className="space-y-4 border-t border-border pt-2">
                <div className="space-y-2">
                  <Label htmlFor="success-fee-amount">
                    Success Fee Amount{" "}
                    <span className="text-brand-rose">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="success-fee-amount"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="5,000.00"
                      value={amountInput.draft}
                      onKeyDown={amountInput.blockInvalidKeys}
                      onBlur={amountInput.handleBlur}
                      onChange={(e) => amountInput.handleChange(e.target.value)}
                      className="pl-8"
                      aria-invalid={amountError ? true : undefined}
                    />
                  </div>
                  <p
                    className={
                      amountError
                        ? "text-xs text-destructive"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {amountError ??
                      `Minimum $1, maximum $${SUCCESS_FEE_MAX.toLocaleString()}.`}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="probation-period-days">
                    Probation Period
                  </Label>
                  <div className="relative">
                    <Input
                      id="probation-period-days"
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="90"
                      min={1}
                      max={PROBATION_MAX_DAYS}
                      value={formData.probationPeriodDays || ""}
                      onKeyDown={blockInvalidKeys}
                      onWheel={handleNumberInputWheel}
                      onChange={(e) => handleProbationChange(e.target.value)}
                      className="pr-14"
                      aria-invalid={probationError ? true : undefined}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      Days
                    </span>
                  </div>
                  <p
                    className={
                      probationError
                        ? "text-xs text-destructive"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {probationError ??
                      `Optional — leave blank if there is no probation period. Common values: 30, 60, 90 Days. Maximum ${PROBATION_MAX_DAYS}.`}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SuccessFeesStep({
  formData,
  updateFormData,
  isEditMode,
  readOnly = false,
  successFeeEditable = false,
  storedHasSuccessFee,
  storedSuccessFeeAmount,
  storedProbationPeriodDays,
  stepErrors = {},
  onUpdateStepFieldError,
}: SuccessFeesStepProps) {
  // Editable when creating, or on the edit page once Phase 2 editing is unlocked.
  const lockedView = readOnly || (!!isEditMode && !successFeeEditable);
  const editableHandlers = useSuccessFeesEditableHandlers({
    formData,
    updateFormData,
    onUpdateStepFieldError,
  });

  if (lockedView) {
    return (
      <SuccessFeesLockedView
        storedHasSuccessFee={storedHasSuccessFee}
        storedSuccessFeeAmount={storedSuccessFeeAmount}
        storedProbationPeriodDays={storedProbationPeriodDays}
      />
    );
  }

  return (
    <SuccessFeesEditableView
      formData={formData}
      stepErrors={stepErrors}
      isEditContext={!!isEditMode}
      {...editableHandlers}
    />
  );
}
