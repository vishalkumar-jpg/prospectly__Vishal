import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  AlertCircle,
  ArrowRight,
  CreditCard,
  Loader2,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recruitmentApi } from "@/lib/api/recruitment";
import type {
  CandidatePayoutState,
  ConnectorClassificationInput,
  PayoutScope,
  PayoutStateConnector,
  PayoutRowStatus,
  RecruiterCancellationReason,
  ConnectorCancellationReason,
} from "@/lib/api/recruitment";
import {
  useCandidatePayoutState,
  CANDIDATE_PAYOUT_STATE_KEY,
} from "@/hooks/useCandidatePayoutState";
import { usePrimaryPaymentMethod } from "@/hooks/usePrimaryPaymentMethod";
import { utcDayjs } from "@/lib/dayjs";
import {
  computeConnectorDraftReleasability,
  type ConnectorDraftReleasability,
} from "@/lib/recruitment/connector-payout-gating";
import { cn } from "@/lib/utils";
import { PayoutStatusPill } from "./PayoutStatusPill";
import { PayoutStepHeader } from "./PayoutStepHeader";
import { PayoutPayStep } from "./PayoutPayStep";
import { PayoutSendStep } from "./PayoutSendStep";
import { CancelPayoutLink, BackToReleaseLink } from "./PayoutModeLink";
import { ConnectorIdentity } from "@/components/recruitment/ConnectorIdentity";
import {
  CANCELLATION_REASON_OPTIONS,
  CONNECTOR_CANCELLATION_REASON_OPTIONS,
  getCancellationReasonLabel,
} from "@/lib/recruitment/cancellation-reasons";
import { formatMoneyWithCommas } from "@/lib/formatted-decimal";

// Amount still to collect for a scope, read from payout state. Used to tell a
// refused release ("the fee moved, pay the difference") apart from a genuine
// failure, without depending on the wording of the server's message.
function outstandingTopUp(
  state: CandidatePayoutState | undefined,
  scope: PayoutScope
): number {
  if (!state) return 0;
  if (scope === "connector") {
    return state.connectors.reduce(
      (sum, c) => sum + Number(c.payout?.connectorTopUp ?? 0),
      0
    );
  }
  return Number(state.candidatePayout?.candidateTopUp ?? 0);
}

const MAX_NOTES = 500;
const MIN_NOTES = 3;

// "Editable" = the recruiter can still act on this row: a never-released row
// ('pending') OR a recoverable failure they can retry ('failed'). A
// 'manual_review' row is NOT editable — it renders as a read-only status pill.
const isEditablePayoutStatus = (status?: PayoutRowStatus): boolean =>
  status === "pending" || status === "failed";

type AnyCancellationReason =
  | RecruiterCancellationReason
  | ConnectorCancellationReason;

// Scope-specific copy + reason options for the dialog.
const SCOPE_CONFIG: Record<
  PayoutScope,
  {
    title: string;
    description: string;
    detailsTitle: string;
    detailsDescription: string;
    releaseLabel: string;
    cancelLabel: string;
    reasonOptions: { value: string; label: string }[];
  }
> = {
  connector: {
    title: "Release Connector Payout",
    description: "Release or cancel the connector payout(s) for",
    detailsTitle: "Connector Payout Details",
    detailsDescription: "Connector payout status for",
    releaseLabel: "Release Connector Payout",
    cancelLabel: "Cancel Connector Payout",
    reasonOptions: CONNECTOR_CANCELLATION_REASON_OPTIONS,
  },
  candidate: {
    title: "Release Candidate Bonus",
    description: "Release or cancel the candidate retention bonus for",
    detailsTitle: "Candidate Bonus Details",
    detailsDescription: "Candidate bonus status for",
    releaseLabel: "Release Candidate Bonus",
    cancelLabel: "Cancel Candidate Bonus",
    reasonOptions: CANCELLATION_REASON_OPTIONS,
  },
};

// One-line status detail shown under each row in the read-only details view.
function PayoutRowDetail({
  payout,
}: {
  payout: {
    status: string;
    completedAt: string | null;
    updatedAt: string | null;
    cancellationReason: string | null;
    cancellationNotes: string | null;
  };
}) {
  // Parse the UTC timestamp and render it in the viewer's local timezone
  // (.local()) so the date/time matches the recruiter's region.
  const fmt = (iso: string | null) =>
    iso ? utcDayjs(iso).local().format("MMM D, YYYY h:mm A") : null;
  // Transfer completion time when paid; otherwise the release/last-action time
  // (there is no dedicated "released at" column — updatedAt reflects it).
  const releasedAt = fmt(payout.completedAt) ?? fmt(payout.updatedAt);

  if (payout.status === "completed") {
    return releasedAt ? (
      <p className="mt-1 text-xs text-muted-foreground">
        Released {releasedAt}
      </p>
    ) : null;
  }
  if (payout.status === "onboarding_pending") {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        {releasedAt ? `Released ${releasedAt}. ` : ""}Waiting on the
        recipient&rsquo;s Stripe Connect setup — pays out automatically once
        they finish onboarding.
      </p>
    );
  }
  if (payout.status === "queued" || payout.status === "processing") {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        {releasedAt ? `Released ${releasedAt}. ` : ""}Transfer in progress.
      </p>
    );
  }
  if (payout.status === "cancelled") {
    const reason = getCancellationReasonLabel(payout.cancellationReason);
    return (
      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        {reason && <p>Reason: {reason}</p>}
        {payout.cancellationNotes && (
          <p>&ldquo;{payout.cancellationNotes}&rdquo;</p>
        )}
        {payout.updatedAt && (
          <p>
            Cancelled {utcDayjs(payout.updatedAt).local().format("MMM D, YYYY")}
          </p>
        )}
      </div>
    );
  }
  return null;
}

interface ReleasePayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateLabel: string;
  /** Which payout type this dialog releases/cancels. */
  scope: PayoutScope;
  onSuccess?: () => void;
}

type Draft = {
  connectorUserId: string;
  classificationType: "internal" | "external";
  isActiveEmployee: boolean;
};

function getCancellationFormErrors({
  retained,
  cancellationReason,
  trimmedNotes,
  cancellationNotesLength,
}: {
  retained: boolean;
  cancellationReason: AnyCancellationReason | "";
  trimmedNotes: string;
  cancellationNotesLength: number;
}) {
  if (retained) {
    return { reasonError: null, notesError: null, cancelFormInvalid: false };
  }
  const reasonError = !cancellationReason ? "Please pick a reason." : null;
  const notesError =
    trimmedNotes.length === 0
      ? "Please add a short note."
      : trimmedNotes.length < MIN_NOTES
        ? `Notes must be at least ${MIN_NOTES} characters.`
        : cancellationNotesLength > MAX_NOTES
          ? `Notes must be ${MAX_NOTES} characters or less.`
          : null;
  return {
    reasonError,
    notesError,
    cancelFormInvalid: !!reasonError || !!notesError,
  };
}

// Connector payouts unblock on a per-type waiting period (hire + int/ext
// connectorPayoutWaitDays), so each connector row carries its own waitEndsAt;
// the candidate success-fee unblocks on probation (hire + probationPeriodDays).
// Scoped per dialog so it reports only the relevant blocked date.
function getReleaseBlockerMessage({
  state,
  scope,
  connectorEligibility,
}: {
  state: NonNullable<ReturnType<typeof useCandidatePayoutState>["state"]>;
  scope: PayoutScope;
  connectorEligibility: Map<string, ConnectorDraftReleasability>;
}) {
  const fmt = (iso: string | null) =>
    iso ? utcDayjs(iso).format("MMM D, YYYY") : null;

  if (scope === "connector") {
    // Blocked state follows the in-modal draft classification (not the stored
    // one), so it updates the moment HR toggles Internal/External.
    const blocked = state.connectors.filter(
      (c) =>
        c.payout?.status === "pending" &&
        connectorEligibility.get(c.connectorUserId)?.canReleaseNow === false
    );
    if (blocked.length === 0) return null;
    // Show the soonest upcoming unblock date across blocked connectors (int and
    // ext may differ). ISO strings sort chronologically.
    const nextDate = blocked
      .map((c) => connectorEligibility.get(c.connectorUserId)?.waitEndsAt)
      .filter((d): d is string => !!d)
      .sort()[0];
    const date = fmt(nextDate ?? null);
    return date
      ? `Connector payout available on ${date}`
      : "Waiting period has not elapsed";
  }

  const candidateBlocked =
    state.candidatePayout?.status === "pending" &&
    state.candidatePayout.canReleaseNow === false;
  if (!candidateBlocked) return null;
  const date = fmt(state.probationEndsAt);
  return date
    ? `Release available on ${date}`
    : "Probation period has not elapsed";
}

function buildReleaseClassifications({
  retained,
  drafts,
  pendingConnectors,
}: {
  retained: boolean;
  drafts: Draft[];
  pendingConnectors: PayoutStateConnector[];
}): ConnectorClassificationInput[] {
  if (!retained) return [];
  return drafts
    .filter((d) =>
      pendingConnectors.some((c) => c.connectorUserId === d.connectorUserId)
    )
    .map((d) => ({
      connectorUserId: d.connectorUserId,
      classificationType: d.classificationType,
      ...(d.classificationType === "internal"
        ? { isActiveEmployee: d.isActiveEmployee }
        : {}),
    }));
}

function renderPendingConnectorClassification({
  connector,
  draft,
  updateDraft,
}: {
  connector: PayoutStateConnector;
  draft: Draft;
  updateDraft: (id: string, patch: Partial<Draft>) => void;
}) {
  const isInternal = draft.classificationType === "internal";
  return (
    <div
      key={connector.connectorUserId}
      className={cn(
        "rounded-2xl border p-4 transition-colors",
        isInternal ? "border-brand-success/30" : "border-brand-sky/30"
      )}
    >
      <ConnectorIdentity
        name={connector.name}
        role={connector.role}
        avatar={connector.avatar}
        jobTitle={connector.jobTitle}
        company={connector.company}
        linkedinUrl={connector.linkedinUrl}
      />
      <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-3 border-t border-dashed border-border pt-3.5 max-sm:flex-col max-sm:items-stretch">
        <span className="text-xs font-bold text-muted-foreground max-sm:w-full">
          Classification
        </span>
        <SegmentedControl
          aria-label={`Classification for ${connector.name}`}
          className="max-sm:w-full max-sm:[&>button]:flex-1"
          value={draft.classificationType}
          onValueChange={(value) =>
            updateDraft(connector.connectorUserId, {
              classificationType: value as "internal" | "external",
              // Switching to External clears the internal-only flag; switching
              // back to Internal restores the default checked state.
              isActiveEmployee: value !== "external",
            })
          }
          options={[
            {
              value: "internal",
              label: "Internal",
              activeClassName: "data-[state=on]:text-brand-success",
            },
            {
              value: "external",
              label: "External",
              activeClassName: "data-[state=on]:text-brand-sky",
            },
          ]}
        />
        {isInternal && (
          <label className="flex cursor-pointer items-center gap-2 text-[13px] font-bold text-foreground max-sm:w-full sm:ml-auto">
            <Checkbox
              checked={draft.isActiveEmployee}
              onCheckedChange={(v) =>
                updateDraft(connector.connectorUserId, {
                  isActiveEmployee: v === true,
                })
              }
            />
            Still an active employee
          </label>
        )}
      </div>
    </div>
  );
}

function renderReleaseCancellationForm({
  scope,
  reasonOptions,
  cancellationReason,
  setCancellationReason,
  cancellationNotes,
  setCancellationNotes,
  showCancelErrors,
  reasonError,
  notesError,
  pendingConnectors,
  handledConnectors,
  candidatePayout,
}: {
  scope: PayoutScope;
  reasonOptions: { value: string; label: string }[];
  cancellationReason: AnyCancellationReason | "";
  setCancellationReason: (value: AnyCancellationReason) => void;
  cancellationNotes: string;
  setCancellationNotes: (value: string) => void;
  showCancelErrors: boolean;
  reasonError: string | null;
  notesError: string | null;
  pendingConnectors: PayoutStateConnector[];
  handledConnectors: PayoutStateConnector[];
  candidatePayout: { recipientAmount: string; status: string } | null;
}) {
  return (
    <>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="cancellation-reason" className="font-bold">
            Cancellation reason
            <span className="ml-0.5 text-brand-destructive">*</span>
          </Label>
          <Select
            value={cancellationReason}
            onValueChange={(v) =>
              setCancellationReason(v as AnyCancellationReason)
            }
          >
            <SelectTrigger
              id="cancellation-reason"
              className="rounded-xl"
              aria-invalid={
                showCancelErrors && !!reasonError ? true : undefined
              }
            >
              <SelectValue placeholder="Select a reason…" />
            </SelectTrigger>
            <SelectContent>
              {reasonOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showCancelErrors && reasonError && (
            <p className="text-xs text-brand-destructive">{reasonError}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cancellation-notes" className="font-bold">
            Additional notes
            <span className="ml-0.5 text-brand-destructive">*</span>
          </Label>
          <Textarea
            id="cancellation-notes"
            value={cancellationNotes}
            onChange={(e) => setCancellationNotes(e.target.value)}
            placeholder="Briefly explain the cancellation. The connector will see this."
            maxLength={MAX_NOTES}
            rows={3}
            className="rounded-xl"
            aria-invalid={showCancelErrors && !!notesError ? true : undefined}
          />
          <div className="flex items-center justify-between">
            {showCancelErrors && notesError ? (
              <p className="text-xs text-brand-destructive">{notesError}</p>
            ) : (
              <span />
            )}
            <span
              className={
                cancellationNotes.length > MAX_NOTES
                  ? "text-xs text-brand-destructive"
                  : "text-xs text-muted-foreground"
              }
            >
              {cancellationNotes.length}/{MAX_NOTES}
            </span>
          </div>
        </div>
      </div>

      <NotRetainedWarning
        scope={scope}
        pendingConnectors={pendingConnectors}
        handledConnectors={handledConnectors}
        candidatePayout={candidatePayout}
      />
    </>
  );
}

function renderReleasePayoutLoadedContent({
  scope,
  reasonOptions,
  state,
  retained,
  onSwitchToCancel,
  onSwitchToRelease,
  hasAnyPending,
  pendingConnectors,
  handledConnectors,
  drafts,
  updateDraft,
  cancellationReason,
  setCancellationReason,
  cancellationNotes,
  setCancellationNotes,
  showCancelErrors,
  reasonError,
  notesError,
  releaseBlocker,
}: {
  scope: PayoutScope;
  reasonOptions: { value: string; label: string }[];
  state: NonNullable<ReturnType<typeof useCandidatePayoutState>["state"]>;
  retained: boolean;
  onSwitchToCancel: () => void;
  onSwitchToRelease: () => void;
  hasAnyPending: boolean;
  pendingConnectors: PayoutStateConnector[];
  handledConnectors: PayoutStateConnector[];
  drafts: Draft[];
  updateDraft: (id: string, patch: Partial<Draft>) => void;
  cancellationReason: AnyCancellationReason | "";
  setCancellationReason: (value: AnyCancellationReason) => void;
  cancellationNotes: string;
  setCancellationNotes: (value: string) => void;
  showCancelErrors: boolean;
  reasonError: string | null;
  notesError: string | null;
  releaseBlocker: string | null;
}) {
  const isConnectorScope = scope === "connector";
  return (
    <div className="space-y-4">
      {!retained && hasAnyPending && (
        <BackToReleaseLink onClick={onSwitchToRelease} />
      )}

      {!retained &&
        hasAnyPending &&
        renderReleaseCancellationForm({
          scope,
          reasonOptions,
          cancellationReason,
          setCancellationReason,
          cancellationNotes,
          setCancellationNotes,
          showCancelErrors,
          reasonError,
          notesError,
          pendingConnectors,
          handledConnectors,
          candidatePayout: state.candidatePayout,
        })}

      {isConnectorScope && retained && pendingConnectors.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-bold">
            Confirm connector classification
          </Label>
          {pendingConnectors.map((c) => {
            const draft = drafts.find(
              (d) => d.connectorUserId === c.connectorUserId
            );
            if (!draft) return null;
            return renderPendingConnectorClassification({
              connector: c,
              draft,
              updateDraft,
            });
          })}
        </div>
      )}

      {isConnectorScope && handledConnectors.length > 0 && (
        <div className="space-y-3">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Already processed
          </Label>
          <div className="space-y-3">
            {handledConnectors.map((c) => (
              <div
                key={c.connectorUserId}
                className="rounded-2xl border border-border bg-muted/30 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <ConnectorIdentity
                    name={c.name}
                    role={c.role}
                    avatar={c.avatar}
                    jobTitle={c.jobTitle}
                    company={c.company}
                    linkedinUrl={c.linkedinUrl}
                  />
                  {c.payout && (
                    <div className="shrink-0">
                      <PayoutStatusPill payout={c.payout} />
                    </div>
                  )}
                </div>
                {c.payout && <PayoutRowDetail payout={c.payout} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isConnectorScope && state.candidatePayout && (
        <div className="border-t border-border pt-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">
              Candidate bonus
              <span className="ml-1.5 text-xs text-muted-foreground">
                $
                {formatMoneyWithCommas(
                  Number(state.candidatePayout.recipientAmount)
                )}
              </span>
            </span>
            {isEditablePayoutStatus(state.candidatePayout.status) ? (
              <span className="text-xs font-medium text-brand-warning">
                {state.candidatePayout.status === "failed"
                  ? "Will be retried"
                  : "Will be released"}
              </span>
            ) : (
              <PayoutStatusPill payout={state.candidatePayout} />
            )}
          </div>
          <PayoutRowDetail payout={state.candidatePayout} />
        </div>
      )}

      {releaseBlocker && retained && (
        <div className="rounded-xl border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
          {releaseBlocker}
        </div>
      )}

      {retained && hasAnyPending && (
        <CancelPayoutLink onClick={onSwitchToCancel} />
      )}
    </div>
  );
}

function renderReleasePayoutDialogBody({
  scope,
  reasonOptions,
  loading,
  error,
  state,
  refetch,
  retained,
  onSwitchToCancel,
  onSwitchToRelease,
  hasAnyPending,
  pendingConnectors,
  handledConnectors,
  drafts,
  updateDraft,
  cancellationReason,
  setCancellationReason,
  cancellationNotes,
  setCancellationNotes,
  showCancelErrors,
  reasonError,
  notesError,
  releaseBlocker,
}: {
  scope: PayoutScope;
  reasonOptions: { value: string; label: string }[];
  loading: boolean;
  error: Error | null;
  state: ReturnType<typeof useCandidatePayoutState>["state"];
  refetch: () => void;
  retained: boolean;
  onSwitchToCancel: () => void;
  onSwitchToRelease: () => void;
  hasAnyPending: boolean;
  pendingConnectors: PayoutStateConnector[];
  handledConnectors: PayoutStateConnector[];
  drafts: Draft[];
  updateDraft: (id: string, patch: Partial<Draft>) => void;
  cancellationReason: AnyCancellationReason | "";
  setCancellationReason: (value: AnyCancellationReason) => void;
  cancellationNotes: string;
  setCancellationNotes: (value: string) => void;
  showCancelErrors: boolean;
  reasonError: string | null;
  notesError: string | null;
  releaseBlocker: string | null;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-2xl border border-brand-destructive/20 bg-brand-destructive/5 p-4">
        <div className="flex items-start gap-2 text-sm font-semibold text-brand-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Couldn&rsquo;t load payout state. Please try again.</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!state) return null;

  return renderReleasePayoutLoadedContent({
    scope,
    reasonOptions,
    state,
    retained,
    onSwitchToCancel,
    onSwitchToRelease,
    hasAnyPending,
    pendingConnectors,
    handledConnectors,
    drafts,
    updateDraft,
    cancellationReason,
    setCancellationReason,
    cancellationNotes,
    setCancellationNotes,
    showCancelErrors,
    reasonError,
    notesError,
    releaseBlocker,
  });
}

function isReleaseConfirmDisabled({
  mutationPending,
  loading,
  hasError,
  hasAnyPending,
  retained,
  hasReleasableNow,
  cancelFormInvalid,
  showCancelErrors,
  blockedByMissingCard = false,
}: {
  mutationPending: boolean;
  loading: boolean;
  hasError: boolean;
  hasAnyPending: boolean;
  retained: boolean;
  hasReleasableNow: boolean;
  cancelFormInvalid: boolean;
  showCancelErrors: boolean;
  /** Pay step only: there is no card on file to charge. */
  blockedByMissingCard?: boolean;
}) {
  return (
    mutationPending ||
    loading ||
    hasError ||
    !hasAnyPending ||
    blockedByMissingCard ||
    // Per-row independent release: enabled as long as at least one pending row
    // is eligible now. Rows still inside their window are released later.
    (retained && !hasReleasableNow) ||
    (!retained && cancelFormInvalid && showCancelErrors)
  );
}

export default function ReleasePayoutDialog({
  open,
  onOpenChange,
  candidateId,
  candidateLabel,
  scope,
  onSuccess,
}: ReleasePayoutDialogProps) {
  const queryClient = useQueryClient();
  const config = SCOPE_CONFIG[scope];
  const isConnectorScope = scope === "connector";
  const [retained, setRetained] = useState(true);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [cancellationReason, setCancellationReason] = useState<
    AnyCancellationReason | ""
  >("");
  const [cancellationNotes, setCancellationNotes] = useState("");
  const [showCancelErrors, setShowCancelErrors] = useState(false);
  // Which step of the two-step release is showing. Only consulted while a charge
  // is actually outstanding — see `activeStep`.
  const [step, setStep] = useState<1 | 2>(1);
  // A declined card. Kept in the dialog (not a toast) so the recruiter reads it
  // as a payment failure, next to the Try Again action.
  const [chargeError, setChargeError] = useState<string | null>(null);
  // Set when a Release is refused because the fee moved and a further amount is
  // owed. Shown on the Pay step the recruiter is bounced back to.
  const [feeChangedNotice, setFeeChangedNotice] = useState<string | null>(null);

  const { primaryPaymentMethod, loading: paymentMethodLoading } =
    usePrimaryPaymentMethod();

  const { state, loading, error, refetch } = useCandidatePayoutState(
    candidateId,
    { enabled: open }
  );

  const pendingConnectors = useMemo<PayoutStateConnector[]>(
    () =>
      (state?.connectors ?? []).filter((c) =>
        isEditablePayoutStatus(c.payout?.status)
      ),
    [state]
  );
  const handledConnectors = useMemo<PayoutStateConnector[]>(
    () =>
      (state?.connectors ?? []).filter(
        (c) => !c.payout || !isEditablePayoutStatus(c.payout.status)
      ),
    [state]
  );

  // Seed drafts from server state on open / refetch.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setChargeError(null);
    setFeeChangedNotice(null);
    setRetained(true);
    setCancellationReason("");
    setCancellationNotes("");
    setShowCancelErrors(false);
    setDrafts(
      pendingConnectors.map((c) => ({
        connectorUserId: c.connectorUserId,
        classificationType:
          c.classificationType === "internal" ? "internal" : "external",
        isActiveEmployee: c.isActiveEmployee ?? true,
      }))
    );
  }, [open, pendingConnectors]);

  const updateDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((prev) =>
      prev.map((d) => (d.connectorUserId === id ? { ...d, ...patch } : d))
    );

  // Release eligibility derived from the in-modal DRAFT classification (not the
  // saved one), mirroring the server gating so the Release button and previews
  // react instantly to Internal/External switches. Display-only — the server
  // re-validates from stored data at release (see connector-payout-gating.ts).
  const connectorEligibility = useMemo(() => {
    const map = new Map<string, ConnectorDraftReleasability>();
    if (!state) return map;
    for (const d of drafts) {
      map.set(
        d.connectorUserId,
        computeConnectorDraftReleasability(d.classificationType, state)
      );
    }
    return map;
  }, [drafts, state]);

  const releaseBlocker = useMemo(
    () =>
      state
        ? getReleaseBlockerMessage({ state, scope, connectorEligibility })
        : null,
    [state, scope, connectorEligibility]
  );

  // Total top-up HR will be charged if they release now — summed over the
  // connector rows that are actually releasable (pending + window elapsed), the
  // only rows that get charged this round. >0 only when the Flat Referral Fee
  // was raised after hire. Display-only; the server recomputes the real charge.
  const topUpTotal = useMemo(() => {
    if (!state || !isConnectorScope) return 0;
    return state.connectors.reduce((sum, c) => {
      const p = c.payout;
      const releasableNow = connectorEligibility.get(
        c.connectorUserId
      )?.canReleaseNow;
      if (
        isEditablePayoutStatus(p?.status) &&
        // Must already be classified: the Pay step has no classification form,
        // and the server refuses to collect for an unclassified row. Legacy rows
        // hired before classification was mandatory therefore skip the Pay step
        // and fall back to the single-step release, which still works.
        c.classificationType &&
        releasableNow &&
        p?.connectorTopUp
      ) {
        return sum + Number(p.connectorTopUp);
      }
      return sum;
    }, 0);
  }, [state, isConnectorScope, connectorEligibility]);

  // Candidate-scope equivalent: the extra HR is charged to pay the bonus at the
  // latest Success Fee, when releasable now (>0 only after a raise/enable).
  const candidateTopUpTotal = useMemo(() => {
    if (!state || isConnectorScope) return 0;
    const p = state.candidatePayout;
    return p?.canReleaseNow && p.candidateTopUp ? Number(p.candidateTopUp) : 0;
  }, [state, isConnectorScope]);

  // The charge gating the release for the active scope (connector or candidate).
  const topUpForCharge = isConnectorScope ? topUpTotal : candidateTopUpTotal;

  // Total connector payout released this round — summed over connector rows that
  // are editable and past their waiting window (the rows this action pays out
  // now). Display-only, mirrors topUpTotal's row filter; shown on the confirm
  // button so HR sees how much they're releasing.
  const connectorReleaseTotal = useMemo(() => {
    if (!state || !isConnectorScope) return 0;
    return state.connectors.reduce((sum, c) => {
      const p = c.payout;
      const releasableNow = connectorEligibility.get(
        c.connectorUserId
      )?.canReleaseNow;
      return isEditablePayoutStatus(p?.status) &&
        releasableNow &&
        p?.recipientAmount
        ? sum + Number(p.recipientAmount)
        : sum;
    }, 0);
  }, [state, isConnectorScope, connectorEligibility]);

  const trimmedNotes = cancellationNotes.trim();
  const { reasonError, notesError, cancelFormInvalid } =
    getCancellationFormErrors({
      retained,
      cancellationReason,
      trimmedNotes,
      cancellationNotesLength: cancellationNotes.length,
    });

  // The top-up already collected for this scope, if any. Set once the Pay step
  // has succeeded — it survives a refresh, which is what lets a reopened dialog
  // resume on the Send step instead of asking for the money again.
  const fundedTopUp = isConnectorScope
    ? (state?.connectorTopUpFunded ?? null)
    : (state?.candidateTopUpFunded ?? null);

  // Step 1 of the two-step release: collects the fee top-up ONLY. Sends nothing.
  // A declined card therefore reports a declined card — the whole reason the
  // release was split in two.
  const paymentCollectedDescription = isConnectorScope
    ? `Payment complete. Review the amount and release the connector payout for ${candidateLabel}.`
    : `Payment complete. Review the amount and release the retention bonus for ${candidateLabel}.`;

  const fundMutation = useMutation({
    mutationFn: () =>
      recruitmentApi.fundCandidatePayoutTopUp(candidateId, { scope }),
    onSuccess: (result) => {
      setChargeError(null);
      setFeeChangedNotice(null);
      setStep(2);
      if (result?.amount && Number(result.amount) > 0) {
        toast({
          variant: "success",
          title: `Payment of $${formatMoneyWithCommas(Number(result.amount))} collected`,
          description: paymentCollectedDescription,
        });
      }
      void queryClient.invalidateQueries({
        queryKey: [CANDIDATE_PAYOUT_STATE_KEY, candidateId],
      });
      // Refreshes the kanban card so it shows "Payment collected — payout not
      // sent yet" while the recruiter is still on the Send step.
      void queryClient.invalidateQueries({
        queryKey: ["/api/recruitment/candidates/job"],
      });
    },
    onError: (err: Error) => {
      setChargeError(
        err?.message ||
          "We couldn't collect the payment. Nothing has been sent. Please try again."
      );
    },
  });

  const mutation = useMutation({
    mutationFn: () => {
      // Classifications are only meaningful for the connector scope.
      const classifications = isConnectorScope
        ? buildReleaseClassifications({ retained, drafts, pendingConnectors })
        : [];
      return recruitmentApi.releaseCandidatePayouts(candidateId, {
        scope,
        retained,
        ...(retained
          ? { classifications }
          : {
              cancellationReason: cancellationReason as AnyCancellationReason,
              cancellationNotes: trimmedNotes,
            }),
      });
    },
    onSuccess: () => {
      if (retained) {
        toast({
          variant: "success",
          title: isConnectorScope
            ? "Connector payout released"
            : "Candidate bonus released",
          description: isConnectorScope
            ? `The connector referral payout for ${candidateLabel} has been released successfully.`
            : `The retention bonus for ${candidateLabel} has been released to the candidate.`,
        });
      } else {
        toast({
          variant: "success",
          title: isConnectorScope
            ? "Connector payout cancelled"
            : "Candidate bonus cancelled",
          description: isConnectorScope
            ? `The connector payout for ${candidateLabel} was cancelled and will not be sent.`
            : `The retention bonus for ${candidateLabel} was cancelled and will not be paid.`,
        });
      }
      queryClient.invalidateQueries();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: async (err) => {
      // A release is refused when the fee moved and a further amount is owed —
      // a price change, not a failure. Refetch and, if something is now due,
      // bounce back to the Pay step with the amount instead of erroring. The
      // owed figure is re-read from state rather than parsed out of the message.
      const refreshed = await refetch();
      const owed = outstandingTopUp(refreshed.data, scope);
      if (owed > 0) {
        setFeeChangedNotice(err?.message ?? null);
        setChargeError(null);
        setStep(1);
        return;
      }
      toast({
        variant: "destructive",
        title: isConnectorScope
          ? "Failed to release connector payout"
          : "Failed to release candidate bonus",
        description:
          err?.message ||
          "Nothing was charged or sent. Please review the payout details and try again.",
      });
    },
  });

  // Sends the payout. Any post-hire fee top-up was already collected by the Pay
  // step, so this no longer moves money out of the recruiter's card — the server
  // still calls its top-up service, which is idempotent and no-ops here.
  const handleConfirm = () => {
    if (cancelFormInvalid) {
      setShowCancelErrors(true);
      return;
    }
    mutation.mutate();
  };

  // Scoped to this dialog's payout type — connector rows or the candidate bonus.
  // "Editable" includes recoverable 'failed' rows (retry), not just 'pending'.
  const hasAnyPending =
    !!state &&
    (isConnectorScope
      ? state.connectors.some((c) => isEditablePayoutStatus(c.payout?.status))
      : isEditablePayoutStatus(state.candidatePayout?.status));

  // Per-row independent release: at least one editable row (of this scope) whose
  // window has elapsed under its current DRAFT classification. Drives the Release
  // button's enabled state so switching Internal/External updates it instantly —
  // rows still inside their waiting period are simply released later. The server
  // re-validates from stored data on release, so this stays UX-only.
  const hasReleasableNow =
    !!state &&
    (isConnectorScope
      ? pendingConnectors.some(
          (c) =>
            connectorEligibility.get(c.connectorUserId)?.canReleaseNow === true
        )
      : isEditablePayoutStatus(state.candidatePayout?.status) &&
        state.candidatePayout?.canReleaseNow === true);

  // Nothing left to action in this scope → read-only details view. Only treat
  // it as "view mode" once state has loaded (avoid flipping the header while
  // the query is in flight).
  const isViewMode = !loading && !error && !!state && !hasAnyPending;

  // A charge is outstanding, so the release becomes two steps: Pay, then Send.
  // When nothing is owed (the common case — the fee was never raised) this is
  // false and the dialog renders exactly as it always has, in one step.
  const needsFundStep = !isViewMode && topUpForCharge > 0;
  const activeStep: 1 | 2 = needsFundStep && step === 1 ? 1 : 2;
  // Two-step flow only while the recruiter is releasing: choosing "cancel this
  // payout instead" drops `retained`, which falls back to the normal dialog with
  // the cancellation form — so money is never collected for a cancelled payout.
  const showStepper =
    retained &&
    !isViewMode &&
    hasReleasableNow &&
    (needsFundStep || !!fundedTopUp);

  // Figures shown under the tracker's two dots: what the recruiter pays in, and
  // what goes out to the recipient. Once collected, the Pay figure comes from the
  // recorded transaction rather than the (now zero) outstanding preview.
  // The Pay button must show what is owed NOW. A fee raised a second time leaves
  // an earlier funded top-up in place, so preferring `fundedTopUp` here would
  // label the button with the amount already paid.
  const payStepAmount =
    topUpForCharge > 0 ? topUpForCharge : Number(fundedTopUp?.amount ?? 0);
  const sendStepAmount = isConnectorScope
    ? connectorReleaseTotal
    : Number(state?.candidatePayout?.recipientAmount ?? 0);
  const missingPaymentMethod = !paymentMethodLoading && !primaryPaymentMethod;

  // A connector the recruiter has now marked internal + no longer active will be
  // cancelled, not paid. If the top-up is already collected, that money is gone.
  const cancellingAfterPayment =
    !!fundedTopUp &&
    activeStep === 2 &&
    (!retained ||
      (isConnectorScope &&
        drafts.some(
          (d) => d.classificationType === "internal" && !d.isActiveEmployee
        )));

  // Release <-> cancel. Resets the submit-attempted flag so returning to the
  // cancel form doesn't re-open it already showing errors; the typed reason and
  // notes are deliberately kept.
  const switchMode = (next: boolean) => {
    setRetained(next);
    setShowCancelErrors(false);
  };

  // Step 1 action: collect the pending amount. Nothing is released here.
  const handleFund = () => fundMutation.mutate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl max-sm:rounded-none"
        mobileFullscreen
        hideCloseButton
      >
        {/* Brand hero header */}
        <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient px-6 py-5 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative flex items-center gap-3 pr-10">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm">
              <Wallet className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
              {isViewMode ? config.detailsTitle : config.title}
            </DialogTitle>
          </div>
          <DialogDescription className="relative mt-2 text-[13px] leading-relaxed text-white/90">
            {showStepper
              ? "Pay the pending amount first, then the payout is released for"
              : isViewMode
                ? config.detailsDescription
                : config.description}{" "}
            {candidateLabel}.
          </DialogDescription>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {/* Two-step flow (Pay → Send), shown only when a pending amount must
              be collected before the payout can go out. */}
          {showStepper && !loading && !error && !!state ? (
            <>
              <PayoutStepHeader paid={activeStep === 2} />

              {activeStep === 1 ? (
                <PayoutPayStep
                  scope={scope}
                  payAmount={payStepAmount}
                  releaseAmount={sendStepAmount}
                  alreadyPaid={Number(fundedTopUp?.amount ?? 0)}
                  feeChangedNotice={feeChangedNotice}
                  paymentMethod={primaryPaymentMethod}
                  paymentMethodLoading={paymentMethodLoading}
                  chargeError={chargeError}
                  charging={fundMutation.isPending}
                  onSwitchToCancel={() => switchMode(false)}
                />
              ) : (
                <PayoutSendStep scope={scope} releaseAmount={sendStepAmount}>
                  {isConnectorScope && pendingConnectors.length > 0 && (
                    <div className="space-y-2.5">
                      <Label className="text-[12.5px] font-bold">
                        Confirm connector classification
                      </Label>
                      {pendingConnectors.map((c) => {
                        const draft = drafts.find(
                          (d) => d.connectorUserId === c.connectorUserId
                        );
                        if (!draft) return null;
                        return renderPendingConnectorClassification({
                          connector: c,
                          draft,
                          updateDraft,
                        });
                      })}
                    </div>
                  )}
                </PayoutSendStep>
              )}
            </>
          ) : (
            renderReleasePayoutDialogBody({
              scope,
              reasonOptions: config.reasonOptions,
              loading,
              error,
              state,
              refetch,
              retained,
              onSwitchToCancel: () => switchMode(false),
              onSwitchToRelease: () => switchMode(true),
              hasAnyPending,
              pendingConnectors,
              handledConnectors,
              drafts,
              updateDraft,
              cancellationReason,
              setCancellationReason,
              cancellationNotes,
              setCancellationNotes,
              showCancelErrors,
              reasonError,
              notesError,
              releaseBlocker,
            })
          )}

          {/* The money is already collected, so a cancellation now keeps it. */}
          {cancellingAfterPayment && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-brand-destructive/25 bg-brand-destructive/10 p-4 text-xs text-brand-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                You already paid{" "}
                <strong>
                  ${formatMoneyWithCommas(Number(fundedTopUp?.amount ?? 0))}
                </strong>{" "}
                for this payout. If you cancel it now, that amount will{" "}
                <strong>not</strong> be refunded.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-border bg-background px-6 py-4 max-sm:[&>button]:flex-1">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending || fundMutation.isPending}
          >
            {isViewMode ? "Close" : "Cancel"}
          </Button>
          {/* Read-only details view: no action button, just Close above. */}
          {showStepper && activeStep === 1 && (
            <Button
              onClick={handleFund}
              disabled={isReleaseConfirmDisabled({
                mutationPending: mutation.isPending || fundMutation.isPending,
                loading,
                hasError: !!error,
                hasAnyPending,
                retained,
                hasReleasableNow,
                cancelFormInvalid,
                showCancelErrors,
                // Can't charge a card we don't have. The step body explains it
                // and links to payment settings.
                blockedByMissingCard: missingPaymentMethod,
              })}
              className="bg-brand-gradient text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg"
            >
              {fundMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing payment&hellip;
                </>
              ) : (
                <>
                  <CreditCard className="mr-1.5 h-4 w-4" />
                  Pay ${formatMoneyWithCommas(payStepAmount)} &amp; Continue
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          )}
          {showStepper && activeStep === 2 && (
            <Button
              onClick={handleConfirm}
              disabled={isReleaseConfirmDisabled({
                mutationPending: mutation.isPending,
                loading,
                hasError: !!error,
                hasAnyPending,
                retained,
                hasReleasableNow,
                cancelFormInvalid,
                showCancelErrors,
              })}
              className="bg-brand-gradient text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Releasing payout&hellip;
                </>
              ) : (
                <>
                  <Wallet className="mr-1.5 h-4 w-4" />
                  Release ${formatMoneyWithCommas(sendStepAmount)} to the{" "}
                  {isConnectorScope ? "connector" : "candidate"}
                </>
              )}
            </Button>
          )}
          {!isViewMode && !showStepper && (
            <Button
              onClick={handleConfirm}
              disabled={isReleaseConfirmDisabled({
                mutationPending: mutation.isPending,
                loading,
                hasError: !!error,
                hasAnyPending,
                retained,
                hasReleasableNow,
                cancelFormInvalid,
                showCancelErrors,
              })}
              variant={retained ? "default" : "destructive"}
              className={cn(
                retained &&
                  "bg-brand-gradient text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg"
              )}
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {retained
                ? isConnectorScope
                  ? connectorReleaseTotal > 0
                    ? `${config.releaseLabel} · $${formatMoneyWithCommas(
                        connectorReleaseTotal
                      )}`
                    : config.releaseLabel
                  : state?.candidatePayout
                    ? `${config.releaseLabel} · $${formatMoneyWithCommas(
                        Number(state.candidatePayout.recipientAmount)
                      )}`
                    : config.releaseLabel
                : config.cancelLabel}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Contextual warning shown when retained=false. Spells out exactly which
// rows will be cancelled now and which were already handled (and therefore
// will NOT be reversed by this action).
function NotRetainedWarning({
  scope,
  pendingConnectors,
  handledConnectors,
  candidatePayout,
}: {
  scope: PayoutScope;
  pendingConnectors: PayoutStateConnector[];
  handledConnectors: PayoutStateConnector[];
  candidatePayout: { recipientAmount: string; status: string } | null;
}) {
  const cancelLines: string[] = [];
  if (scope === "connector") {
    for (const c of pendingConnectors) {
      if (c.payout) {
        cancelLines.push(
          `${c.name}'s pending payout ($${formatMoneyWithCommas(Number(c.payout.recipientAmount))})`
        );
      }
    }
  } else if (
    candidatePayout &&
    (candidatePayout.status === "pending" ||
      candidatePayout.status === "failed")
  ) {
    cancelLines.push(
      `the candidate bonus ($${formatMoneyWithCommas(Number(candidatePayout.recipientAmount))})`
    );
  }

  // Already-transferred connectors are only relevant on the connector scope.
  const alreadyPaid =
    scope === "connector"
      ? handledConnectors.filter((c) => c.payout?.status === "completed")
      : [];

  return (
    <div className="space-y-2 rounded-2xl border border-brand-warning/20 bg-brand-warning/10 p-4 text-xs text-brand-warning">
      {cancelLines.length > 0 && (
        <p>
          <strong>Will be cancelled:</strong> {formatList(cancelLines)}.
        </p>
      )}
      {alreadyPaid.length > 0 && (
        <p>
          <strong>Already transferred:</strong>{" "}
          {formatList(
            alreadyPaid.map(
              (c) =>
                `${c.name}'s $${formatMoneyWithCommas(Number(c.payout?.recipientAmount ?? 0))}`
            )
          )}{" "}
          — these will <strong>not</strong> be reversed (no refunds in this
          phase).
        </p>
      )}
      {cancelLines.length === 0 && alreadyPaid.length === 0 && (
        <p>Cancels any remaining pending payouts for this candidate.</p>
      )}
    </div>
  );
}

function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
