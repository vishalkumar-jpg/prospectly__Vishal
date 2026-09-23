import { useState, type ReactNode } from "react";
import { AlertTriangle, Check, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  DELETE_REASON_LABELS,
  EXPORT_DATA_OPTIONS,
  OTHER_REASON_LABEL,
  PREFLIGHT_CLEAR_TILES,
  type DeleteAccountSurveyState,
} from "./delete-account.constants";

/** Matches Privacy "Add Privacy" primary CTA hover lift + glow */
const WIZARD_PRIMARY_CTA_CLASS =
  "bg-brand-gradient text-white shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg";

type WizardPanelShellProps = {
  children: ReactNode;
  footer: ReactNode;
};

function WizardPanelShell({ children, footer }: WizardPanelShellProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-brand-card">
      <div className="p-5 sm:p-8">{children}</div>
      <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-8 sm:py-5 [&_button]:h-11 [&_button]:w-full sm:[&_button]:h-10 sm:[&_button]:w-auto">
        {footer}
      </div>
    </div>
  );
}

export function DeleteAccountStep1Preflight({
  onCancel,
  onContinue,
}: {
  onCancel: () => void;
  onContinue: () => void;
}) {
  return (
    <WizardPanelShell
      footer={
        <>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            className={WIZARD_PRIMARY_CTA_CLASS}
            onClick={onContinue}
          >
            Continue
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </>
      }
    >
      <h2 className="text-xl font-bold tracking-tight">Pre-flight check</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Before deletion, we need to resolve any open marketplace activity. This
        is a regulatory requirement for accounts holding funds.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PREFLIGHT_CLEAR_TILES.map((tile) => (
          <div
            key={tile.title}
            className="rounded-xl border border-brand-success/20 bg-brand-success/5 p-4"
          >
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-success">
              <Check className="h-3 w-3" aria-hidden />
              Clear
            </div>
            <p className="text-sm font-semibold">{tile.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {tile.subtitle}
            </p>
          </div>
        ))}
      </div>
    </WizardPanelShell>
  );
}

function ExportCheckboxRow({
  id,
  label,
  description,
  size,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  size: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-0">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="border-border data-[state=checked]:border-transparent data-[state=checked]:bg-brand-gradient"
      />
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </label>
      <span className="shrink-0 text-xs text-muted-foreground">{size}</span>
    </div>
  );
}

export function DeleteAccountStep2Export({
  userEmail,
  onBack,
  onSkip,
  onContinue,
}: {
  userEmail: string;
  onBack: () => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(EXPORT_DATA_OPTIONS.map((o) => [o.id, o.defaultChecked]))
  );

  const hasExportSelection = Object.values(checked).some(Boolean);

  return (
    <WizardPanelShell
      footer={
        <>
          <Button type="button" variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={onSkip}>
              Skip export
            </Button>
            <Button
              type="button"
              className={WIZARD_PRIMARY_CTA_CLASS}
              disabled={!hasExportSelection}
              onClick={onContinue}
            >
              Send export & continue
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </>
      }
    >
      <h2 className="text-xl font-bold tracking-tight">
        Export your data first
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        We&apos;ll email you a ZIP archive. This satisfies your GDPR Article 20
        right to data portability and protects you from accidental loss.
      </p>
      <div className="mt-4">
        {EXPORT_DATA_OPTIONS.map((opt) => (
          <ExportCheckboxRow
            key={opt.id}
            id={opt.id}
            label={opt.label}
            description={opt.description}
            size={opt.size}
            checked={checked[opt.id] ?? false}
            onCheckedChange={(v) =>
              setChecked((prev) => ({ ...prev, [opt.id]: v }))
            }
          />
        ))}
      </div>
      <div className="mt-5 flex gap-2 rounded-xl border border-brand-sky/20 bg-brand-sky/5 p-4 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-sky" aria-hidden />
        <p>
          Export will be emailed to{" "}
          <strong className="text-foreground">
            {userEmail || "your account email"}
          </strong>{" "}
          within ~10 minutes. You can continue with the deletion flow now —
          we&apos;ll send the archive in parallel.
        </p>
      </div>
    </WizardPanelShell>
  );
}

export function DeleteAccountStep3Survey({
  survey,
  onSurveyChange,
  onBack,
  onSkip,
  onContinue,
}: {
  survey: DeleteAccountSurveyState;
  onSurveyChange: (next: DeleteAccountSurveyState) => void;
  onBack: () => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  const isOther = survey.primaryReason === OTHER_REASON_LABEL;
  const hasSurveyInput =
    Boolean(survey.primaryReason) || Boolean(survey.feedbackText.trim());

  return (
    <WizardPanelShell
      footer={
        <>
          <Button type="button" variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={onSkip}>
              Skip
            </Button>
            <Button
              type="button"
              className={WIZARD_PRIMARY_CTA_CLASS}
              disabled={!hasSurveyInput}
              onClick={onContinue}
            >
              Continue
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </>
      }
    >
      <h2 className="text-xl font-bold tracking-tight">
        Help us improve (optional)
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Why are you leaving? Your answer is anonymous and won&apos;t affect
        deletion.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {DELETE_REASON_LABELS.map((label) => {
          const selected = survey.primaryReason === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() =>
                onSurveyChange({ ...survey, primaryReason: label })
              }
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors",
                selected
                  ? "border-brand-rose/40 bg-brand-rose/5"
                  : "border-border hover:border-border hover:bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "relative h-4 w-4 shrink-0 rounded-full border-2",
                  selected ? "border-brand-rose" : "border-muted-foreground/50"
                )}
              >
                {selected && (
                  <span className="absolute inset-[3px] rounded-full bg-brand-rose" />
                )}
              </span>
              {label}
            </button>
          );
        })}
      </div>
      {isOther && (
        <div className="mt-4 space-y-2">
          <Label htmlFor="other-reason" className="text-sm font-medium">
            Please tell us more
          </Label>
          <Textarea
            id="other-reason"
            placeholder="Specify your reason..."
            value={survey.additionalDetails}
            onChange={(e) =>
              onSurveyChange({
                ...survey,
                additionalDetails: e.target.value,
              })
            }
            className="min-h-[80px] resize-none"
          />
        </div>
      )}
      <div className="mt-4 space-y-2">
        <Label htmlFor="delete-feedback" className="text-xs font-medium">
          Anything else? (optional)
        </Label>
        <Textarea
          id="delete-feedback"
          placeholder="We read every response."
          value={survey.feedbackText}
          onChange={(e) =>
            onSurveyChange({ ...survey, feedbackText: e.target.value })
          }
          rows={3}
          className="resize-none"
        />
      </div>
    </WizardPanelShell>
  );
}

export function DeleteAccountStep4Confirm({
  userEmail,
  emailConfirm,
  onEmailConfirmChange,
  onBack,
  onDeleteClick,
  deleteDisabled,
}: {
  userEmail: string;
  emailConfirm: string;
  onEmailConfirmChange: (value: string) => void;
  onBack: () => void;
  onDeleteClick: () => void;
  deleteDisabled: boolean;
}) {
  const emailMatches =
    emailConfirm.trim().toLowerCase() === userEmail.trim().toLowerCase();

  return (
    <WizardPanelShell
      footer={
        <>
          <Button type="button" variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteDisabled || !emailMatches}
            onClick={onDeleteClick}
            className="font-semibold shadow-lg shadow-destructive/20"
          >
            Delete Account within 24 hours
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Final confirmation
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            After confirming, your account is scheduled for permanent removal
            within 24 hours. You can cancel anytime before then by signing in.
          </p>
        </div>
      </div>
      <div className="mt-6 rounded-xl bg-muted/60 p-4 text-sm">
        <p className="font-semibold">When you confirm, we will:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Sign you out of all active sessions immediately</li>
          <li>Hide your profile from the marketplace</li>
          <li>
            Permanently remove your personal data after the 24-hour window
            unless you cancel
          </li>
          <li>Retain transaction records for 7 years (tax compliance)</li>
        </ul>
        <p className="mt-4 font-semibold">You will lose:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>248 contacts &amp; their notes</li>
          <li>17 completed introductions &amp; reviews</li>
          <li>Marketplace reputation score</li>
        </ul>
      </div>
      <div className="mt-6 space-y-2">
        <Label htmlFor="email-confirm" className="text-xs font-medium">
          Type your email{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {userEmail}
          </code>{" "}
          to confirm
        </Label>
        <Input
          id="email-confirm"
          type="email"
          autoComplete="off"
          placeholder="Type email here"
          value={emailConfirm}
          onChange={(e) => onEmailConfirmChange(e.target.value)}
        />
      </div>
    </WizardPanelShell>
  );
}
