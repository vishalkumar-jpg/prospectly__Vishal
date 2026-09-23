import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  CheckCircle2,
  Clock,
  Info,
  Lock,
  Users,
  Zap,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { JobFormData, UpdateJobFormData } from "./types";
import { getStepFieldError, type StepErrors } from "./validation";
import { BLOCKED_KEYS, CONNECTOR_PAYOUT_WAIT_MAX_DAYS } from "./constants";
import { handleNumberInputWheel } from "./numberInputWheel";
import { useModuleConfig } from "@/hooks/useModuleConfig";
import { cn } from "@/lib/utils";

type ConnectorType = "int" | "ext";

/** Plain-language label for the connector waiting window. */
function waitWindowLabel(days?: number | null): string {
  return days != null && Number(days) > 0
    ? `${days} days after hire`
    : "after the waiting period";
}

interface ConnectorPayoutStepProps {
  formData: JobFormData;
  updateFormData: UpdateJobFormData;
  isEditMode?: boolean;
  readOnly?: boolean;
  /** In edit mode, allow editing when true; otherwise the step stays read-only. */
  connectorPayoutEditable?: boolean;
  storedIntPayoutWaits?: boolean | null;
  storedExtPayoutWaits?: boolean | null;
  storedIntConnectorPayoutWaitDays?: number | null;
  storedExtConnectorPayoutWaitDays?: number | null;
  stepErrors?: StepErrors;
  onUpdateStepFieldError?: (field: string, message: string | undefined) => void;
}

function ConnectorPayoutLockedView({
  storedIntPayoutWaits,
  storedExtPayoutWaits,
  storedIntConnectorPayoutWaitDays,
  storedExtConnectorPayoutWaitDays,
}: {
  storedIntPayoutWaits?: boolean | null;
  storedExtPayoutWaits?: boolean | null;
  storedIntConnectorPayoutWaitDays?: number | null;
  storedExtConnectorPayoutWaitDays?: number | null;
}) {
  return (
    <div className="space-y-6">
      <div className="mb-4 text-left sm:mb-6 lg:mb-8">
        <h2 className="text-2xl font-extrabold text-foreground">
          When do connectors get paid?
          <Badge variant="secondary" className="ml-2 align-middle text-xs">
            <Lock className="mr-1 h-3 w-3" />
            Read-only
          </Badge>
        </h2>
        <p className="mt-2 text-muted-foreground">
          This is when the people who helped you fill this role become eligible
          for payout after you hire a candidate. You release each payout
          yourself from the candidate’s Hired card. You chose this timing when
          you posted the job, so it can’t be changed now.
        </p>
      </div>

      <div className="w-full space-y-4">
        {/* Plain-language explainer so a first-time reader understands the rows. */}
        <div className="flex items-start gap-2.5 rounded-xl bg-brand-amethyst/10 p-3.5 text-[13px] leading-relaxed text-brand-amethyst">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <b className="font-semibold">Payable on hire</b> means you can
            release their payout as soon as you mark a candidate hired.{" "}
            <b className="font-semibold">Payable after a waiting period</b>{" "}
            means the payout is held for a set number of days after the hire
            date before you can release it. Either way, you release payouts from
            the candidate’s Hired card.
          </p>
        </div>

        <Card className="rounded-2xl border border-border shadow-brand-card">
          <CardHeader>
            <CardTitle className="text-lg">
              When each helper gets paid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ReadOnlyPayoutRow
              icon={<Building2 className="h-4 w-4" />}
              title="Your Employees"
              description="People on your company’s payroll who helped with this hire"
              waits={storedIntPayoutWaits === true}
              waitLabel={waitWindowLabel(storedIntConnectorPayoutWaitDays)}
            />
            <ReadOnlyPayoutRow
              icon={<Users className="h-4 w-4" />}
              title="Outside Connectors"
              description="People outside your company who referred a candidate"
              waits={storedExtPayoutWaits === true}
              waitLabel={waitWindowLabel(storedExtConnectorPayoutWaitDays)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function useConnectorPayoutHandlers({
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
      const prospective = { ...formData, ...next };
      for (const field of [
        "intConnectorPayoutWaitDays",
        "extConnectorPayoutWaitDays",
      ]) {
        onUpdateStepFieldError?.(
          field,
          getStepFieldError("connectorPayout", field, prospective)
        );
      }
    },
    [formData, onUpdateStepFieldError]
  );

  const handlePayoutChange = useCallback(
    (connector: ConnectorType, waits: boolean) => {
      // When a type is paid right away its waiting period is not usable — reset
      // it to 0 so a stale value isn't persisted.
      const next: Partial<JobFormData> =
        connector === "int"
          ? {
              intPayoutWaits: waits,
              ...(waits ? {} : { intConnectorPayoutWaitDays: 0 }),
            }
          : {
              extPayoutWaits: waits,
              ...(waits ? {} : { extConnectorPayoutWaitDays: 0 }),
            };
      updateFormData(next);
      refreshFieldErrors(next);
    },
    [updateFormData, refreshFieldErrors]
  );

  const handleWaitDaysChange = useCallback(
    (connector: ConnectorType, raw: string) => {
      const trimmed = raw.trim();
      const value =
        trimmed === ""
          ? 0
          : Math.min(
              CONNECTOR_PAYOUT_WAIT_MAX_DAYS,
              Math.max(0, Number.isFinite(parseInt(trimmed, 10)) ? parseInt(trimmed, 10) : 0)
            );
      const next: Partial<JobFormData> =
        connector === "int"
          ? { intConnectorPayoutWaitDays: value }
          : { extConnectorPayoutWaitDays: value };
      updateFormData(next);
      refreshFieldErrors(next);
    },
    [updateFormData, refreshFieldErrors]
  );

  return { blockInvalidKeys, handlePayoutChange, handleWaitDaysChange };
}

function ConnectorPayoutEditableView({
  formData,
  updateFormData,
  stepErrors,
  onUpdateStepFieldError,
}: {
  formData: JobFormData;
  updateFormData: UpdateJobFormData;
  stepErrors: StepErrors;
  onUpdateStepFieldError?: (field: string, message: string | undefined) => void;
}) {
  const { blockInvalidKeys, handlePayoutChange, handleWaitDaysChange } =
    useConnectorPayoutHandlers({
      formData,
      updateFormData,
      onUpdateStepFieldError,
    });

  // Internal timing may be locked to an org admin default. When set (> 0), the
  // internal card is read-only and its values are seeded here so they persist
  // and pass validation — the server re-derives them from the config regardless.
  const { data: moduleConfig } = useModuleConfig();
  const adminInternalDays = moduleConfig?.internalConnectorPayoutWaitDays;
  const internalLocked =
    typeof adminInternalDays === "number" && adminInternalDays > 0;

  useEffect(() => {
    if (!internalLocked) return;
    if (
      formData.intPayoutWaits === true &&
      formData.intConnectorPayoutWaitDays === adminInternalDays
    ) {
      return;
    }
    updateFormData({
      intPayoutWaits: true,
      intConnectorPayoutWaitDays: adminInternalDays,
    });
  }, [
    internalLocked,
    adminInternalDays,
    formData.intPayoutWaits,
    formData.intConnectorPayoutWaitDays,
    updateFormData,
  ]);

  return (
    <div className="space-y-6">
      <div className="mb-4 text-left sm:mb-6 lg:mb-8">
        <h2 className="text-2xl font-extrabold text-foreground">
          When do connectors get paid?
        </h2>
        <p className="mt-2 text-muted-foreground">
          Decide whether connectors become payable as soon as you hire, or only
          after a waiting period. You release each payout yourself from the
          candidate’s Hired card.
        </p>
      </div>

      <div className="w-full space-y-6">
        <div className="flex items-start gap-2 rounded-lg bg-brand-amethyst/10 p-3 text-xs text-brand-amethyst">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Once published, connector payout settings cannot be edited. The
            waiting period is counted from the candidate&apos;s hire date.
          </p>
        </div>

        <Card className="rounded-2xl border-2 border-brand-amethyst/30 shadow-brand-card">
          <CardHeader>
            <CardTitle className="text-lg">
              When do connectors get paid?
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose when each type of connector becomes payable after a
              candidate is hired. You can set them separately.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {internalLocked ? (
              <ReadOnlyPayoutRow
                icon={<Building2 className="h-4 w-4" />}
                title="Your Employees"
                description="People on your company payroll who helped with this hire"
                waits
                waitLabel={waitWindowLabel(adminInternalDays)}
                note="Set by your organization"
              />
            ) : (
              <PayoutTypeCard
                icon={<Building2 className="h-[19px] w-[19px]" />}
                title="Your Employees"
                description="People on your company payroll who helped with this hire"
                waits={formData.intPayoutWaits}
                days={formData.intConnectorPayoutWaitDays}
                daysError={stepErrors.intConnectorPayoutWaitDays}
                blockInvalidKeys={blockInvalidKeys}
                onChange={(waits) => handlePayoutChange("int", waits)}
                onDaysChange={(raw) => handleWaitDaysChange("int", raw)}
              />
            )}
            <PayoutTypeCard
              icon={<Users className="h-[19px] w-[19px]" />}
              title="Outside Connectors"
              description="Anyone outside your company who helped recruit this candidate"
              waits={formData.extPayoutWaits}
              days={formData.extConnectorPayoutWaitDays}
              daysError={stepErrors.extConnectorPayoutWaitDays}
              blockInvalidKeys={blockInvalidKeys}
              onChange={(waits) => handlePayoutChange("ext", waits)}
              onDaysChange={(raw) => handleWaitDaysChange("ext", raw)}
            />

            <div className="flex items-start gap-2.5 rounded-xl bg-brand-success/10 p-3.5 text-[13px] leading-relaxed text-brand-success">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <PayoutSummary
                empWaits={formData.intPayoutWaits}
                outWaits={formData.extPayoutWaits}
                empLabel={waitWindowLabel(formData.intConnectorPayoutWaitDays)}
                outLabel={waitWindowLabel(formData.extConnectorPayoutWaitDays)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ConnectorPayoutStep({
  formData,
  updateFormData,
  isEditMode,
  readOnly = false,
  connectorPayoutEditable = false,
  storedIntPayoutWaits,
  storedExtPayoutWaits,
  storedIntConnectorPayoutWaitDays,
  storedExtConnectorPayoutWaitDays,
  stepErrors = {},
  onUpdateStepFieldError,
}: ConnectorPayoutStepProps) {
  const lockedView = readOnly || (!!isEditMode && !connectorPayoutEditable);

  if (lockedView) {
    return (
      <ConnectorPayoutLockedView
        storedIntPayoutWaits={storedIntPayoutWaits}
        storedExtPayoutWaits={storedExtPayoutWaits}
        storedIntConnectorPayoutWaitDays={storedIntConnectorPayoutWaitDays}
        storedExtConnectorPayoutWaitDays={storedExtConnectorPayoutWaitDays}
      />
    );
  }

  return (
    <ConnectorPayoutEditableView
      formData={formData}
      updateFormData={updateFormData}
      stepErrors={stepErrors}
      onUpdateStepFieldError={onUpdateStepFieldError}
    />
  );
}

interface PayoutTypeCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  waits: boolean;
  days: number;
  daysError?: string;
  blockInvalidKeys: (e: KeyboardEvent<HTMLInputElement>) => void;
  onChange: (waits: boolean) => void;
  onDaysChange: (raw: string) => void;
}

function PayoutTypeCard({
  icon,
  title,
  description,
  waits,
  days,
  daysError,
  blockInvalidKeys,
  onChange,
  onDaysChange,
}: PayoutTypeCardProps) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-extrabold leading-tight text-foreground">
            {title}
          </p>
          <p className="text-[11.5px] leading-tight text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <PayoutOption
          selected={!waits}
          icon={<Zap className="h-3.5 w-3.5" />}
          label="Payable on hire"
          sub="Release as soon as you mark them hired"
          onClick={() => onChange(false)}
        />
        <PayoutOption
          selected={waits}
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Pay after waiting period"
          sub={`Releasable ${waitWindowLabel(days)}`}
          onClick={() => onChange(true)}
        />
      </div>

      {/* Revealed only once this type is set to wait — avoids a confusing
          disabled field in the default (pay-right-away) state. */}
      {waits && (
        <div className="mt-3 space-y-2 rounded-xl border border-brand-amethyst/30 bg-brand-amethyst/5 p-4">
          <Label htmlFor={`${title}-wait-days`}>Waiting Period</Label>
          <div className="relative">
            <Input
              id={`${title}-wait-days`}
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="30"
              min={1}
              max={CONNECTOR_PAYOUT_WAIT_MAX_DAYS}
              value={days || ""}
              onKeyDown={blockInvalidKeys}
              onWheel={handleNumberInputWheel}
              onChange={(e) => onDaysChange(e.target.value)}
              className="pr-14"
              aria-invalid={daysError ? true : undefined}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              Days
            </span>
          </div>
          <p
            className={
              daysError
                ? "text-xs text-destructive"
                : "text-xs text-muted-foreground"
            }
          >
            {daysError ??
              `Counted from the hire date. Common values: 30, 60, 90 Days. Maximum ${CONNECTOR_PAYOUT_WAIT_MAX_DAYS}.`}
          </p>
        </div>
      )}
    </div>
  );
}

interface PayoutOptionProps {
  selected: boolean;
  icon: ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
}

function PayoutOption({
  selected,
  icon,
  label,
  sub,
  onClick,
}: PayoutOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex flex-col gap-1 rounded-xl border-2 px-3.5 py-3 text-left transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-brand-amethyst bg-brand-amethyst/10"
          : "border-border hover:border-brand-amethyst/40 hover:bg-brand-amethyst/5"
      )}
    >
      <span
        className={cn(
          "flex items-center gap-2 text-[13px] font-bold",
          selected ? "text-brand-amethyst" : "text-foreground"
        )}
      >
        {icon}
        {label}
        <span
          className={cn(
            "ml-auto grid h-[15px] w-[15px] place-items-center rounded-full border-[1.5px]",
            selected ? "border-brand-amethyst" : "border-border"
          )}
        >
          {selected && (
            <span className="h-[7px] w-[7px] rounded-full bg-brand-amethyst" />
          )}
        </span>
      </span>
      <span className="text-[10.5px] leading-tight text-muted-foreground">
        {sub}
      </span>
    </button>
  );
}

function PayoutSummary({
  empWaits,
  outWaits,
  empLabel,
  outLabel,
}: {
  empWaits: boolean;
  outWaits: boolean;
  empLabel: string;
  outLabel: string;
}) {
  const phrase = (waits: boolean, label: string) =>
    waits ? label : "as soon as you hire";

  if (empWaits === outWaits && empLabel === outLabel) {
    return (
      <span>
        <b className="font-extrabold">All connectors</b> are payable{" "}
        <b className="font-extrabold">{phrase(empWaits, empLabel)}</b>.
      </span>
    );
  }
  return (
    <span>
      Your <b className="font-extrabold">employees</b> are payable{" "}
      <b className="font-extrabold">{phrase(empWaits, empLabel)}</b>, and{" "}
      <b className="font-extrabold">outside connectors</b> are payable{" "}
      <b className="font-extrabold">{phrase(outWaits, outLabel)}</b>.
    </span>
  );
}

function ReadOnlyPayoutRow({
  icon,
  title,
  description,
  waits,
  waitLabel,
  note,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  waits: boolean;
  waitLabel: string;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-2.5 flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-extrabold leading-tight text-foreground">
            {title}
          </p>
          <p className="text-[11.5px] leading-tight text-muted-foreground">
            {description}
          </p>
        </div>
        {note && (
          <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
            <Lock className="mr-1 h-3 w-3" />
            {note}
          </Badge>
        )}
      </div>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold",
          waits
            ? "bg-brand-amethyst/10 text-brand-amethyst"
            : "bg-brand-success/10 text-brand-success"
        )}
      >
        {waits ? (
          <>
            <Clock className="h-3.5 w-3.5 shrink-0" /> Payable {waitLabel}
          </>
        ) : (
          <>
            <Zap className="h-3.5 w-3.5 shrink-0" /> Payable as soon as you mark
            a candidate hired
          </>
        )}
      </div>
    </div>
  );
}
