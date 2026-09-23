import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  AlertTriangle,
  Check,
  DollarSign,
  Loader2,
  UserCheck,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useShortlistBreakdown } from "@/hooks/useShortlistCandidate";
import { recruitmentApi } from "@/lib/api/recruitment";
import type {
  ConnectorClassificationInput,
  PayoutStateConnector,
} from "@/lib/api/recruitment";
import { toUTC, utcDayjs } from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import { ConnectorIdentity } from "@/components/recruitment/ConnectorIdentity";
import { formatMoneyWithCommas } from "@/lib/formatted-decimal";

interface HireCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateLabel: string;
  /**
   * Sourced from /payout/:candidateId/state — the candidate detail endpoint
   * withholds connectors until the hire is committed, one stage after this
   * dialog opens. Classification is null here on a first hire.
   */
  connectors: PayoutStateConnector[];
  onSuccess?: () => void;
}

type ClassificationDraft = {
  connectorUserId: string;
  classificationType: "internal" | "external";
  isActiveEmployee: boolean;
};

export default function HireCandidateDialog({
  open,
  onOpenChange,
  candidateId,
  candidateLabel,
  connectors,
  onSuccess,
}: HireCandidateDialogProps) {
  const queryClient = useQueryClient();

  // The referral fee is charged at hire. Server-computed amount; we only
  // render it.
  const { data: breakdown, isLoading: breakdownLoading } =
    useShortlistBreakdown(open ? candidateId : null);
  const flat = breakdown?.flat ?? null;
  // Hiring fires TWO Stripe charges — the referral fee and, on jobs that have
  // one, the success fee. Every recruiter-facing figure must use the total, or
  // the dialog understates what the card is about to be hit for. The two legs
  // are tracked separately because each has its own idempotency: a retry after a
  // failed success-fee charge owes only that leg.
  const totalDue = flat?.totalDueAtHire ?? 0;
  const showReferralRow = !!flat && flat.amountDueAtHire > 0;
  const showSuccessFeeRow = !!flat && flat.successFeeDueAtHire > 0;
  const willChargeAtHire = totalDue > 0;
  // Hire is the only point at which the recruiter is charged, so it is also the
  // only place a missing card can fail the flow. Surface it before they commit
  // rather than letting the server reject the capture.
  const missingPaymentMethod =
    !!breakdown && !breakdown.paymentMethod && willChargeAtHire;
  const hireButtonLabel = willChargeAtHire
    ? `Pay $${formatMoneyWithCommas(totalDue)} & Move to Hired`
    : "Move to Hired";
  // Matches the wording in the Success Fees step of the job wizard.
  const successFeeReleaseNote =
    breakdown?.probationPeriodDays && breakdown.probationPeriodDays > 0
      ? `One-time bonus for the candidate, released after ${breakdown.probationPeriodDays} days on the job.`
      : "One-time bonus for the candidate, released once they're hired.";
  // YYYY-MM-DD in UTC — anchors the date input + the "future date" guard.
  // Using utcDayjs keeps the comparison stable regardless of the recruiter's
  // local timezone (a recruiter in Asia at 02:00 local sees "today" as the
  // same UTC day as the server, not a date that's already in the past UTC).
  const today = useMemo(() => utcDayjs().format("YYYY-MM-DD"), []);

  const [hireDate, setHireDate] = useState<string>(today);
  const [drafts, setDrafts] = useState<ClassificationDraft[]>([]);

  useEffect(() => {
    if (open) {
      setHireDate(today);
      setDrafts(
        connectors.map((c) => ({
          connectorUserId: c.connectorUserId,
          classificationType:
            c.classificationType === "internal" ? "internal" : "external",
          isActiveEmployee: c.isActiveEmployee ?? true,
        }))
      );
    }
  }, [open, connectors, today]);

  const updateDraft = (
    connectorUserId: string,
    patch: Partial<ClassificationDraft>
  ) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.connectorUserId === connectorUserId ? { ...d, ...patch } : d
      )
    );
  };

  const mutation = useMutation({
    mutationFn: () => {
      // Classification is required for every connector on every job — it
      // drives the connector waiting-period gate + inactive-employee skip.
      const classifications: ConnectorClassificationInput[] = drafts.map(
        (d) => ({
          connectorUserId: d.connectorUserId,
          classificationType: d.classificationType,
          ...(d.classificationType === "internal"
            ? { isActiveEmployee: d.isActiveEmployee }
            : {}),
        })
      );
      // Convert the YYYY-MM-DD picker value to a UTC ISO string for the API
      // payload. toUTC interprets the bare date as UTC midnight (e.g. 2026-05-01
      // → 2026-05-01T00:00:00Z), so the recruiter's local timezone can't shift
      // the stored hire date by a day.
      return recruitmentApi.hireCandidate(candidateId, {
        hireDate: toUTC(hireDate).toISOString(),
        classifications,
      });
    },
    onSuccess: () => {
      toast.success("Candidate moved to Hired", {
        description: `${candidateLabel} is now in the Hired stage. Release connector and candidate payouts when you are ready.`,
      });
      queryClient.invalidateQueries();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Failed to move candidate to Hired", {
        description:
          error?.message ||
          "The hire was not saved. Check your payment method and try again.",
      });
    },
  });

  const dateInvalid =
    !hireDate || utcDayjs(hireDate).isAfter(utcDayjs(today), "day");

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
              <UserCheck className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
              Move {candidateLabel} to Hired
            </DialogTitle>
          </div>
          <DialogDescription className="relative mt-2 text-[13px] leading-relaxed text-white/90">
            Confirm the hire date and classify each connector to complete the
            move.
          </DialogDescription>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Payment — both hire charges, itemized, so the total matches the button */}
          {flat && (
            <div className="rounded-2xl border border-brand-success/25 bg-brand-success/10 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-success/15 text-brand-success">
                  <DollarSign className="h-4 w-4" />
                </div>
                <p className="text-sm font-extrabold text-foreground">
                  Payment
                </p>
              </div>

              {willChargeAtHire ? (
                <div className="space-y-3 text-sm">
                  {showReferralRow && (
                    <div>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-bold text-foreground">
                          Referral Fee
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          ${formatMoneyWithCommas(flat.amountDueAtHire)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        Paid to the connector who referred this candidate.
                      </p>
                    </div>
                  )}

                  {showSuccessFeeRow && (
                    <div>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-bold text-foreground">
                          Success Fee
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          ${formatMoneyWithCommas(flat.successFeeDueAtHire)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {successFeeReleaseNote}
                      </p>
                    </div>
                  )}

                  <div className="flex items-baseline justify-between gap-3 border-t border-brand-success/25 pt-2.5">
                    <span className="font-extrabold text-foreground">
                      Total charged today
                    </span>
                    <span className="font-mono text-[17px] font-extrabold text-brand-success">
                      ${formatMoneyWithCommas(totalDue)}
                    </span>
                  </div>

                  {breakdown?.paymentMethod && (
                    <p className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-foreground">
                        {breakdown.paymentMethod.brand}
                      </span>
                      Ending in {breakdown.paymentMethod.last4}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  <b className="font-extrabold text-foreground">
                    No additional charge
                  </b>{" "}
                  — you've already paid for this candidate.
                </p>
              )}
            </div>
          )}

          {missingPaymentMethod && (
            <div className="flex items-start gap-3 rounded-2xl border border-brand-destructive/20 bg-brand-destructive/10 p-4 text-sm text-brand-destructive">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold">No Payment Method Found</p>
                <p className="mt-1 text-brand-destructive/90">
                  Please add a payment method in your{" "}
                  <a
                    href="/dashboard/settings/payments"
                    className="font-medium underline"
                  >
                    payment settings
                  </a>{" "}
                  before hiring this candidate.
                </p>
              </div>
            </div>
          )}

          {/* Hire date */}
          <div className="space-y-2">
            <Label htmlFor="hire-date" className="text-sm font-bold">
              Hire date
            </Label>
            <Input
              id="hire-date"
              type="date"
              value={hireDate}
              max={today}
              onChange={(e) => setHireDate(e.target.value)}
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              The probation window starts from this date.
            </p>
          </div>

          {/* Connector classification */}
          <div className="space-y-3">
            <Label className="text-sm font-bold">Classify each connector</Label>
            <p className="text-xs text-muted-foreground">
              Internal = on your payroll. External = anyone else.
            </p>

            <div className="space-y-3">
              {drafts.map((draft) => {
                const meta = connectors.find(
                  (c) => c.connectorUserId === draft.connectorUserId
                );
                const name = meta?.name ?? "Connector";
                const isInternal = draft.classificationType === "internal";

                return (
                  <div
                    key={draft.connectorUserId}
                    className={cn(
                      "rounded-2xl border p-4 transition-colors",
                      isInternal
                        ? "border-brand-success/30"
                        : "border-brand-sky/30"
                    )}
                  >
                    <ConnectorIdentity
                      name={name}
                      role={meta?.role}
                      avatar={meta?.avatar}
                      jobTitle={meta?.jobTitle}
                      company={meta?.company}
                      linkedinUrl={meta?.linkedinUrl}
                    />

                    {/* Classification */}
                    <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-3 border-t border-dashed border-border pt-3.5 max-sm:flex-col max-sm:items-stretch">
                      <span className="text-xs font-bold text-muted-foreground max-sm:w-full">
                        Classification
                      </span>
                      <SegmentedControl
                        aria-label={`Classification for ${name}`}
                        className="max-sm:w-full max-sm:[&>button]:flex-1"
                        value={draft.classificationType}
                        onValueChange={(value) =>
                          updateDraft(draft.connectorUserId, {
                            classificationType: value as
                              | "internal"
                              | "external",
                            // Switching to External clears the internal-only
                            // flag; switching back to Internal restores the
                            // default checked state.
                            isActiveEmployee: value !== "external",
                          })
                        }
                        options={[
                          {
                            value: "internal",
                            label: "Internal",
                            activeClassName:
                              "data-[state=on]:text-brand-success",
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
                              updateDraft(draft.connectorUserId, {
                                isActiveEmployee: v === true,
                              })
                            }
                          />
                          Active employee
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-border bg-background px-6 py-4 max-sm:[&>button]:flex-1">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending ||
              dateInvalid ||
              drafts.length === 0 ||
              breakdownLoading ||
              missingPaymentMethod
            }
            className="bg-brand-gradient text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg"
          >
            {mutation.isPending || breakdownLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {breakdownLoading ? "Loading…" : hireButtonLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
