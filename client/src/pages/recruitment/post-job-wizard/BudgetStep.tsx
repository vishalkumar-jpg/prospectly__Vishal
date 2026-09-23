import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Coins, Loader2, Lock, Banknote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFlatReferralFee } from "@/hooks/useFlatReferralFee";
import { useCallback, type KeyboardEvent } from "react";
import type { JobFormData, SalaryPeriod, UpdateJobFormData } from "./types";
import { getStepFieldError, type StepErrors } from "./validation";
import {
  SALARY_MAX_CAP,
  PAYMENT_MAX_CAP,
  SALARY_NOTES_MAX,
  BLOCKED_KEYS,
} from "./constants";
import { cn } from "@/lib/utils";
import {
  getSalaryCurrencySymbol,
  SALARY_CURRENCY_OPTIONS,
  type SalaryCurrencyCode,
} from "@/lib/salary-currency";
import {
  clampSalaryInteger,
  formatSalaryInteger,
} from "@/lib/formatted-integer";
import {
  clampFormattedDecimal,
  formatMoneyOrDash,
  formatMoneyWithCommas,
} from "@/lib/formatted-decimal";
import { useDecimalAmountInput } from "./useDecimalAmountInput";

interface BudgetStepProps {
  formData: JobFormData;
  updateFormData: UpdateJobFormData;
  isEditMode?: boolean;
  readOnly?: boolean;
  /**
   * Phase 1: allow the Flat Referral Fee to be edited in edit mode (active
   * flat_referral jobs only). Unlocks ONLY the Flat Referral card + its live
   * breakdown; all other budget fields keep their normal edit-mode behavior.
   */
  flatFeeEditable?: boolean;
  storedProviderFee?: string | null;
  storedProcessingFee?: string | null;
  storedTotalAmount?: string | null;
  storedFlatReferralAmount?: string | null;
  stepErrors?: StepErrors;
  onUpdateStepFieldError?: (field: string, message: string | undefined) => void;
}

type SalaryField = "salaryRangeMin" | "salaryRangeMax";

function pickLockedOrCalculated(params: {
  budgetLocked: boolean;
  stored: string | null | undefined;
  calculated: number | null;
}): number | null {
  const { budgetLocked, stored, calculated } = params;
  if (budgetLocked && stored) return Number(stored);
  return calculated;
}

function clampSalaryValue(raw: string): number | null {
  return clampSalaryInteger(raw, SALARY_MAX_CAP);
}

function useBudgetStepHandlers(params: {
  formData: JobFormData;
  updateFormData: UpdateJobFormData;
  onUpdateStepFieldError?: (field: string, message: string | undefined) => void;
}) {
  const { formData, updateFormData, onUpdateStepFieldError } = params;

  const blockInvalidKeys = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (BLOCKED_KEYS.includes(e.key)) e.preventDefault();
  }, []);

  const handleSalaryChange = useCallback(
    (field: SalaryField, raw: string) => {
      const value = clampSalaryValue(raw);
      if (value === null) return;

      const newMin =
        field === "salaryRangeMin" ? value : formData.salaryRangeMin;
      const newMax =
        field === "salaryRangeMax" ? value : formData.salaryRangeMax;

      updateFormData({ [field]: value });

      const prospective = {
        ...formData,
        salaryRangeMin: newMin,
        salaryRangeMax: newMax,
      };
      onUpdateStepFieldError?.(
        "salaryRangeMin",
        getStepFieldError("budget", "salaryRangeMin", prospective)
      );
      onUpdateStepFieldError?.(
        "salaryRangeMax",
        getStepFieldError("budget", "salaryRangeMax", prospective)
      );
    },
    [formData, updateFormData, onUpdateStepFieldError]
  );

  const handleNotesChange = useCallback(
    (raw: string) => {
      const value = raw.slice(0, SALARY_NOTES_MAX);
      updateFormData({ salaryRangeNotes: value });

      const prospective = { ...formData, salaryRangeNotes: value };
      onUpdateStepFieldError?.(
        "salaryRangeNotes",
        getStepFieldError("budget", "salaryRangeNotes", prospective)
      );
    },
    [formData, updateFormData, onUpdateStepFieldError]
  );

  const handleFlatChange = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed === "") {
        updateFormData({ flatReferralAmount: 0 });
        onUpdateStepFieldError?.(
          "flatReferralAmount",
          "Flat Referral Fee is required"
        );
        return;
      }
      const value = clampFormattedDecimal(raw, PAYMENT_MAX_CAP);
      if (value === null) return;

      updateFormData({ flatReferralAmount: value });

      const prospective = { ...formData, flatReferralAmount: value };
      onUpdateStepFieldError?.(
        "flatReferralAmount",
        getStepFieldError("budget", "flatReferralAmount", prospective)
      );
    },
    [formData, updateFormData, onUpdateStepFieldError]
  );

  return {
    blockInvalidKeys,
    handleSalaryChange,
    handleNotesChange,
    handleFlatChange,
  };
}

function BudgetStepHeader(params: {
  budgetLocked: boolean;
  salaryLocked: boolean;
}) {
  const { budgetLocked, salaryLocked } = params;
  const fullyLocked = budgetLocked && salaryLocked;
  return (
    <div className="text-left mb-4 sm:mb-6 lg:mb-8">
      <h2 className="text-2xl font-extrabold text-foreground">
        Budget &amp; Pricing Model
        {fullyLocked && (
          <Badge variant="secondary" className="ml-2 text-xs align-middle">
            <Lock className="h-3 w-3 mr-1" />
            Read-only
          </Badge>
        )}
      </h2>
      <p className="text-muted-foreground mt-2">
        {fullyLocked
          ? "Pricing model and budget cannot be modified after posting"
          : budgetLocked
            ? "Salary range can be updated. Pricing model and fees stay locked after posting."
            : "Choose how you want to pay for this hire, then set the salary range"}
      </p>
    </div>
  );
}

function SalaryCurrencyInput(params: {
  value: number;
  currency: SalaryCurrencyCode;
  currencySymbol: string;
  placeholder: string;
  disabled: boolean;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onChange: (raw: string) => void;
}) {
  const {
    value,
    currency,
    currencySymbol,
    placeholder,
    disabled,
    onKeyDown,
    onChange,
  } = params;
  return (
    <div
      className={cn(
        "flex h-10 w-full overflow-hidden rounded-md border border-input bg-background",
        "ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center border-r border-input bg-muted/50 px-2.5 text-sm text-muted-foreground",
          currencySymbol.length >= 3 ? "min-w-[3rem]" : "min-w-[2.25rem]"
        )}
      >
        {currencySymbol}
      </span>
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={formatSalaryInteger(value, currency)}
        onKeyDown={onKeyDown}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 flex-1 rounded-none border-0 pl-3 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        disabled={disabled}
      />
    </div>
  );
}

function FieldError(params: { message?: string }) {
  if (!params.message) return null;
  return <p className="text-xs text-destructive">{params.message}</p>;
}

function SalaryRangeCard(params: {
  formData: JobFormData;
  salaryLocked: boolean;
  stepErrors: StepErrors;
  blockInvalidKeys: (e: KeyboardEvent<HTMLInputElement>) => void;
  handleSalaryChange: (field: SalaryField, raw: string) => void;
  handleNotesChange: (raw: string) => void;
  updateFormData: UpdateJobFormData;
}) {
  const {
    formData,
    salaryLocked,
    stepErrors,
    blockInvalidKeys,
    handleSalaryChange,
    handleNotesChange,
    updateFormData,
  } = params;

  const currencySymbol = getSalaryCurrencySymbol(formData.salaryCurrency);

  return (
    <Card className="rounded-2xl border border-border shadow-brand-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Banknote className="h-5 w-5 text-brand-success" />
          Salary Range{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (Optional)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[4.5rem_1fr_1fr] gap-4">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={formData.salaryCurrency}
              onValueChange={(v) =>
                updateFormData({ salaryCurrency: v as SalaryCurrencyCode })
              }
              disabled={salaryLocked}
            >
              <SelectTrigger className="w-full px-2 font-semibold">
                <SelectValue>{formData.salaryCurrency}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SALARY_CURRENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.code} value={opt.code}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Minimum</Label>
            <SalaryCurrencyInput
              value={formData.salaryRangeMin}
              currency={formData.salaryCurrency}
              currencySymbol={currencySymbol}
              placeholder={formatSalaryInteger(80000, formData.salaryCurrency)}
              disabled={salaryLocked}
              onKeyDown={blockInvalidKeys}
              onChange={(raw) => handleSalaryChange("salaryRangeMin", raw)}
            />
            <FieldError message={stepErrors.salaryRangeMin} />
          </div>
          <div className="space-y-2">
            <Label>Maximum</Label>
            <SalaryCurrencyInput
              value={formData.salaryRangeMax}
              currency={formData.salaryCurrency}
              currencySymbol={currencySymbol}
              placeholder={formatSalaryInteger(120000, formData.salaryCurrency)}
              disabled={salaryLocked}
              onKeyDown={blockInvalidKeys}
              onChange={(raw) => handleSalaryChange("salaryRangeMax", raw)}
            />
            <FieldError message={stepErrors.salaryRangeMax} />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <Select
            value={formData.salaryPeriod}
            onValueChange={(v) =>
              updateFormData({ salaryPeriod: v as SalaryPeriod })
            }
            disabled={salaryLocked}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yearly">Per Year</SelectItem>
              <SelectItem value="monthly">Per Month</SelectItem>
              <SelectItem value="weekly">Per Week</SelectItem>
              <SelectItem value="hourly">Per Hour</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(!salaryLocked || formData.salaryRangeNotes) && (
          <SalaryNotesField
            formData={formData}
            salaryLocked={salaryLocked}
            stepErrors={stepErrors}
            onNotesChange={handleNotesChange}
          />
        )}
      </CardContent>
    </Card>
  );
}

function SalaryNotesField(params: {
  formData: JobFormData;
  salaryLocked: boolean;
  stepErrors: StepErrors;
  onNotesChange: (raw: string) => void;
}) {
  const { formData, salaryLocked, stepErrors, onNotesChange } = params;
  return (
    <div className="space-y-2 pt-2">
      <Label htmlFor="salaryRangeNotes">Notes (optional)</Label>
      <Textarea
        id="salaryRangeNotes"
        placeholder="e.g. Negotiable based on experience, or As per industry standard"
        value={formData.salaryRangeNotes ?? ""}
        onChange={(e) => onNotesChange(e.target.value)}
        maxLength={SALARY_NOTES_MAX}
        rows={2}
        disabled={salaryLocked}
        aria-invalid={stepErrors.salaryRangeNotes ? true : undefined}
      />
      {!salaryLocked && (
        <div className="flex items-center justify-between">
          {stepErrors.salaryRangeNotes ? (
            <p className="text-xs text-destructive">
              {stepErrors.salaryRangeNotes}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Add context for connectors and candidates about the compensation
              range.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {(formData.salaryRangeNotes ?? "").length}/{SALARY_NOTES_MAX}
          </p>
        </div>
      )}
    </div>
  );
}

function FlatFeeRows(params: {
  stripeFee: number | null;
  applicationFee: number | null;
  total: number | null;
  recalculating: boolean;
}) {
  const { stripeFee, applicationFee, total, recalculating } = params;
  const spinner = recalculating ? (
    <Loader2 className="h-3 w-3 animate-spin text-brand-warning" />
  ) : null;
  const processingFee =
    stripeFee !== null && applicationFee !== null
      ? stripeFee + applicationFee
      : null;
  return (
    <div className="border-t border-brand-warning/30 pt-3 space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Stripe Processing Fee</span>
        <span className="font-medium text-foreground inline-flex items-center gap-1.5">
          {spinner}
          {formatMoneyOrDash(processingFee)}
        </span>
      </div>
      <div className="border-t border-brand-warning/30 pt-2 mt-1">
        <div className="flex justify-between font-bold">
          <span className="text-foreground">Charged when you hire</span>
          <span className="text-lg text-brand-warning">
            {formatMoneyOrDash(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

function FlatReferralCard(params: {
  budgetLocked: boolean;
  flatReferralAmount: number;
  flatFieldError?: string;
  loading: boolean;
  recalculating: boolean;
  stripeFee: number | null;
  applicationFee: number | null;
  total: number | null;
  onFlatChange: (raw: string) => void;
}) {
  const {
    budgetLocked,
    flatReferralAmount,
    flatFieldError,
    loading,
    recalculating,
    stripeFee,
    applicationFee,
    total,
    onFlatChange,
  } = params;

  const amountInput = useDecimalAmountInput({
    value: flatReferralAmount,
    onChange: onFlatChange,
  });

  const showBreakdown = flatReferralAmount > 0;

  return (
    <Card
      aria-invalid={flatFieldError ? true : undefined}
      className={cn(
        "rounded-2xl border-2 shadow-brand-card transition-colors duration-200",
        flatFieldError
          ? "border-destructive ring-2 ring-destructive/20"
          : "border-brand-warning/30"
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Coins className="h-5 w-5 text-brand-warning" />
          Flat Referral Fee
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="bg-brand-warning/10 rounded-lg p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span>Flat fee per hire</span>
              <span className="text-brand-rose">*</span>
            </div>
            {budgetLocked ? (
              <span className="font-semibold text-foreground sm:text-right">
                ${formatMoneyWithCommas(flatReferralAmount)}
              </span>
            ) : (
              <div className="w-full sm:w-40">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="100.00"
                    value={amountInput.draft}
                    onKeyDown={amountInput.blockInvalidKeys}
                    onBlur={amountInput.handleBlur}
                    onChange={(e) => amountInput.handleChange(e.target.value)}
                    className="pl-8 text-right font-medium"
                    aria-label="Flat Referral Fee"
                    aria-invalid={flatFieldError ? true : undefined}
                  />
                </div>
              </div>
            )}
          </div>
          {!budgetLocked && (
            <p
              className={
                flatFieldError
                  ? "text-xs text-destructive"
                  : "text-xs text-muted-foreground"
              }
            >
              {flatFieldError ??
                "Set the total referral fee paid when you hire a candidate — cents allowed (e.g. 312.50)."}
            </p>
          )}

          {showBreakdown &&
            (loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-brand-warning" />
              </div>
            ) : (
              <FlatFeeRows
                stripeFee={stripeFee}
                applicationFee={applicationFee}
                total={total}
                recalculating={recalculating && !loading}
              />
            ))}

          <p className="text-xs text-brand-warning mt-2">
            No per-candidate charge — shortlist as many candidates as you like.
            <br />
            The full flat referral fee is charged only when you move a candidate
            to Hired.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BudgetStep(props: BudgetStepProps) {
  const {
    formData,
    updateFormData,
    isEditMode,
    readOnly = false,
    flatFeeEditable = false,
    storedProviderFee,
    storedProcessingFee,
    storedTotalAmount,
    storedFlatReferralAmount,
    stepErrors = {},
    onUpdateStepFieldError,
  } = props;

  const budgetLocked = !!isEditMode || readOnly;
  // Phase 1: the Flat Referral card unlocks in edit mode for active flat jobs,
  // while the rest of the budget breakdown keeps its normal locked behavior.
  const flatBudgetLocked = budgetLocked && !flatFeeEditable;
  // Salary stays editable on edit; only view mode locks it.
  const salaryLocked = readOnly;

  const flatFee = useFlatReferralFee({
    flatAmount: formData.flatReferralAmount,
    enabled: !flatBudgetLocked,
  });

  // Flat breakdown — stored values when locked (provider/processing/total
  // columns hold the flat stripe/app/total), live hook values otherwise. When
  // the flat fee is editable, the breakdown follows the live edited value.
  const flatStripeFee = pickLockedOrCalculated({
    budgetLocked: flatBudgetLocked,
    stored: storedProviderFee,
    calculated: flatFee.stripeFee,
  });
  const flatApplicationFee = pickLockedOrCalculated({
    budgetLocked: flatBudgetLocked,
    stored: storedProcessingFee,
    calculated: flatFee.applicationFee,
  });
  const flatTotal = pickLockedOrCalculated({
    budgetLocked: flatBudgetLocked,
    stored: storedTotalAmount,
    calculated: flatFee.total,
  });
  // In locked (view / non-editable) mode, show the persisted flat fee — not the
  // live form value, which may be 0/stale while the rest of the breakdown is
  // from storage. When editable, follow the form value the recruiter is typing.
  const flatReferralAmount =
    flatBudgetLocked && storedFlatReferralAmount != null
      ? Number(storedFlatReferralAmount)
      : formData.flatReferralAmount;

  const handlers = useBudgetStepHandlers({
    formData,
    updateFormData,
    onUpdateStepFieldError,
  });

  return (
    <div className="space-y-6">
      <BudgetStepHeader
        budgetLocked={budgetLocked}
        salaryLocked={salaryLocked}
      />
      <div className="w-full space-y-6">
        <SalaryRangeCard
          formData={formData}
          salaryLocked={salaryLocked}
          stepErrors={stepErrors}
          blockInvalidKeys={handlers.blockInvalidKeys}
          handleSalaryChange={handlers.handleSalaryChange}
          handleNotesChange={handlers.handleNotesChange}
          updateFormData={updateFormData}
        />
        <FlatReferralCard
          budgetLocked={flatBudgetLocked}
          flatReferralAmount={flatReferralAmount}
          flatFieldError={stepErrors.flatReferralAmount}
          loading={flatFee.loading}
          recalculating={flatFee.recalculating}
          stripeFee={flatStripeFee}
          applicationFee={flatApplicationFee}
          total={flatTotal}
          onFlatChange={handlers.handleFlatChange}
        />
      </div>
    </div>
  );
}
