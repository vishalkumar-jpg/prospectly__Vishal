import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  RotateCcw,
  Info,
  AlertTriangle,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReinstateOptions } from "@/hooks/useReinstateCandidate";
import type { KanbanCandidate } from "./types";

/**
 * Brand CTA, matching the kanban card's primary buttons. The default `Button`
 * variant is indigo (`--primary`), which reads as a foreign accent next to the
 * purple brand theme this flow lives in.
 */
const CTA_BRAND =
  "border-transparent bg-brand-gradient text-white shadow-brand-cta hover:-translate-y-px hover:text-white";

/**
 * Stages that need a stacked follow-up confirm after Move Back.
 *
 * - `interview_invite_sent`: reinstate clears the booking token, so Resend is
 *   always required — show this confirm every time.
 * - `interview_scheduled`: do NOT list here. The meeting is kept and any
 *   no-show/cancelled outcome is cleared so Mark Outcome works again; Reschedule
 *   stays optional on the card. Forcing a Reschedule confirm was misleading.
 */
const FOLLOW_UP_BY_STAGE: Record<
  string,
  { action: string; body: string; icon: typeof Send }
> = {
  interview_invite_sent: {
    action: "Resend",
    body: "Open their card in Interview Invite Sent and click Resend to send a fresh invite — the new link replaces the old one automatically.",
    icon: Send,
  },
};

interface ReinstateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: KanbanCandidate | null;
  onConfirm: (
    targetStageKey: string,
    options?: { onSuccess?: () => void }
  ) => void;
  isPending?: boolean;
  /** Server-side failure surfaced inline so the dialog can stay open. */
  errorMessage?: string | null;
}

/**
 * "Move Back to Stage" — reinstates a rejected candidate.
 *
 * The stage list comes from the server (`useReinstateOptions`) and contains
 * only stages this candidate actually reached, capped at the stage they were
 * rejected from. Stages that were reached but are dead ends come back
 * `available: false` with a reason and are rendered disabled rather than
 * hidden, so the recruiter understands why.
 *
 * Choosing Interview Invite Sent stacks a Resend confirmation AlertDialog ON
 * TOP of this dialog (AlertDialog is z-[80], Dialog is z-[70]). Interview
 * Scheduled submits immediately with no stacked confirm.
 *
 * No money moves here — reinstating never charges and never refunds. The
 * referral fee is still captured only at Move to Hired.
 */
export default function ReinstateDialog({
  open,
  onOpenChange,
  candidate,
  onConfirm,
  isPending,
  errorMessage,
}: ReinstateDialogProps) {
  const [targetStageKey, setTargetStageKey] = useState("");
  const [stageTouched, setStageTouched] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);

  const { data, isLoading, isError, refetch } = useReinstateOptions(
    open && candidate ? candidate.id : null
  );

  const options = data?.options ?? [];
  const availableOptions = options.filter((o) => o.available);

  // Pre-select when there is exactly one usable stage — the common case for a
  // candidate rejected early, and it saves a pointless click.
  useEffect(() => {
    if (!open) return;
    if (targetStageKey) return;
    if (availableOptions.length === 1) {
      setTargetStageKey(availableOptions[0].stageKey);
    }
  }, [open, availableOptions, targetStageKey]);

  const stageError =
    stageTouched && !targetStageKey ? "Please select a stage" : "";
  const isValid = !!targetStageKey;

  const followUp = FOLLOW_UP_BY_STAGE[targetStageKey] ?? null;
  const targetLabel =
    options.find((o) => o.stageKey === targetStageKey)?.label ?? "";

  const handleClose = (value: boolean) => {
    if (!value) {
      setTargetStageKey("");
      setStageTouched(false);
      setShowFollowUp(false);
    }
    onOpenChange(value);
  };

  const submit = () =>
    onConfirm(targetStageKey, { onSuccess: () => handleClose(false) });

  const handlePrimaryClick = () => {
    setStageTouched(true);
    if (!isValid) return;
    // Invite Sent needs a Resend reminder (token cleared). Scheduled does not.
    if (followUp) {
      setShowFollowUp(true);
      return;
    }
    submit();
  };

  if (!candidate) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg max-sm:rounded-none"
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
                <RotateCcw className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
                Move Back to Stage
              </DialogTitle>
            </div>
            <DialogDescription className="relative mt-2 text-[13px] leading-relaxed text-white/90">
              Return{" "}
              <b className="font-extrabold text-white">
                {candidate.anonymousId}
              </b>{" "}
              to a stage they were previously in.
            </DialogDescription>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            {/* Money reassurance — reinstating is free in both directions. */}
            <div className="flex items-start gap-3 rounded-2xl border border-brand-amethyst/20 bg-brand-amethyst/10 p-4 text-[12.5px] leading-relaxed text-brand-amethyst">
              <Info className="mt-px h-[18px] w-[18px] shrink-0" />
              <p>
                Moving this candidate back{" "}
                <b className="font-extrabold">does not charge you</b> and does
                not refund anything. The referral fee is charged only if the
                candidate reaches <b className="font-extrabold">Hired</b>, at
                the job&apos;s fee current at that time.
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : isError ? (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-brand-destructive/20 bg-brand-destructive/10 p-4 text-[12.5px] leading-relaxed text-brand-destructive">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-px h-[18px] w-[18px] shrink-0" />
                  <p>
                    We couldn&apos;t load the stages for this candidate. Please
                    try again.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Try Again
                </Button>
              </div>
            ) : options.length === 0 ? (
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-[12.5px] leading-relaxed text-muted-foreground">
                <AlertTriangle className="mt-px h-[18px] w-[18px] shrink-0" />
                <p>
                  There is no earlier stage this candidate can be moved back to.
                </p>
              </div>
            ) : (
              <div>
                <Label className="mb-1.5 block text-[13px] font-bold">
                  Move back to <span className="text-brand-destructive">*</span>
                </Label>
                <Select
                  value={targetStageKey}
                  onValueChange={(val) => {
                    setTargetStageKey(val);
                    setStageTouched(true);
                  }}
                  onOpenChange={(o) => {
                    if (!o) setStageTouched(true);
                  }}
                >
                  <SelectTrigger
                    className={cn(stageError && "border-brand-destructive")}
                  >
                    <SelectValue placeholder="Select a stage..." />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((opt) => (
                      <SelectItem
                        key={opt.stageKey}
                        value={opt.stageKey}
                        disabled={!opt.available}
                      >
                        {opt.label}
                        {!opt.available && " — unavailable"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {stageError && (
                  <p className="mt-1 text-xs text-brand-destructive">
                    {stageError}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Only stages this candidate has already been in are listed.
                </p>
                {/* Explain every disabled row so a greyed option isn't a mystery. */}
                {options
                  .filter((o) => !o.available && o.unavailableReason)
                  .map((o) => (
                    <p
                      key={o.stageKey}
                      className="mt-1.5 text-xs leading-relaxed text-muted-foreground"
                    >
                      <b className="font-semibold">{o.label}:</b>{" "}
                      {o.unavailableReason}
                    </p>
                  ))}
              </div>
            )}

            {/* While the follow-up confirmation is stacked on top it owns the
                error display, so this one would be hidden behind it. */}
            {errorMessage && !showFollowUp && (
              <div className="flex items-start gap-3 rounded-2xl border border-brand-destructive/20 bg-brand-destructive/10 p-4 text-[12.5px] leading-relaxed text-brand-destructive">
                <AlertTriangle className="mt-px h-[18px] w-[18px] shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-border bg-background px-6 py-4 max-sm:[&>button]:flex-1">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              className={CTA_BRAND}
              disabled={!isValid || isPending || isLoading}
              onClick={handlePrimaryClick}
            >
              {isPending ? "Moving..." : "Move Back"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stacked ON TOP of the dialog above — AlertDialog is z-[80] to the
          Dialog's z-[70], so the stage picker stays visible behind it. */}
      <AlertDialog
        open={showFollowUp}
        onOpenChange={(next) => {
          if (isPending) return;
          setShowFollowUp(next);
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mb-1 flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-warning/15 text-brand-warning">
                {followUp ? <followUp.icon className="h-5 w-5" /> : null}
              </div>
              <AlertDialogTitle className="text-lg font-extrabold tracking-tight">
                One more step — {followUp?.action}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-[13px] leading-relaxed">
              <b className="font-extrabold text-foreground">
                {candidate.anonymousId}
              </b>{" "}
              will move to{" "}
              <b className="font-extrabold text-foreground">{targetLabel}</b>.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-start gap-3 rounded-2xl border border-brand-warning/20 bg-brand-warning/10 p-4 text-[12.5px] leading-relaxed text-brand-warning">
            <AlertTriangle className="mt-px h-[18px] w-[18px] shrink-0" />
            <p>
              You will need to{" "}
              <b className="font-extrabold">
                {followUp?.action} the interview invite manually
              </b>
              . The candidate&apos;s previous interview link stops working as
              soon as they are moved. {followUp?.body}
            </p>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-3 rounded-2xl border border-brand-destructive/20 bg-brand-destructive/10 p-4 text-[12.5px] leading-relaxed text-brand-destructive">
              <AlertTriangle className="mt-px h-[18px] w-[18px] shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Back</AlertDialogCancel>
            <AlertDialogAction
              className={CTA_BRAND}
              disabled={isPending}
              onClick={(e) => {
                // Keep this dialog mounted while the request is in flight so a
                // failure can be shown here instead of behind the picker.
                e.preventDefault();
                submit();
              }}
            >
              {isPending
                ? "Moving..."
                : `Move Back & ${followUp?.action} Later`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
