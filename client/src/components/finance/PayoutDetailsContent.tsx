import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { toUTC } from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import { StripeConnectModal } from "./StripeConnectModal";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { getStripePayoutStatusQueryKey } from "@/lib/stripe-connect";

/**
 * Formats a completion time in a user-friendly way:
 * - Within 2 hours: Shows relative time like "about 2 hours ago"
 * - After 2 hours: Shows actual date/time like "3 Dec 2025 4:30 PM"
 */
function formatCompletionTime(dateString: string): string {
  const date = toUTC(dateString);
  const hoursDiff = differenceInHours(toUTC(), date);

  if (hoursDiff < 2) {
    return formatDistanceToNow(date, { addSuffix: true });
  }
  return formatLocalizedShortDateTime(dateString);
}

import {
  DollarSign,
  Clock,
  User,
  Check,
  Circle,
  Mail,
  CalendarCheck,
  UserCheck,
  MessageSquare,
  Banknote,
  Shield,
  Info,
  Gift,
  Users,
  Share2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface WorkflowStep {
  step: string;
  label: string;
  description: string;
  status: "completed" | "current" | "pending" | "skipped";
  completedAt: string | null;
  actionNeeded: string | null;
}

export interface PayoutRecord {
  requestId: string;
  contactName: string;
  requester?: {
    fullName?: string;
    email?: string;
  } | null;
  requesterName?: string;
  requesterEmail?: string;
  grossAmount: number;
  netAmount: number;
  payoutStatus?: string;
  payoutReleased: boolean;
  payoutReleasedAt: string | null;
  payoutTriggeredBy?: string | null;
  currentTrustScore?: number | null;
  qualifiesForImmediatePayout?: boolean;
  workflowProgress?: WorkflowStep[];
  createdAt?: string;
  // Credit system fields
  creditsApplied?: number;
  commissionAfterCredits?: number;
  creditsRemainingAfter?: number;
  // Marketplace fields
  isMarketplaceDeal?: boolean;
  marketplaceRole?: "claimer" | "sharer" | null;
  claimerShare?: number;
  sharerShare?: number;
  relatedPayoutId?: string | null;
  // Payout account fields
  payoutAccountConnected?: boolean;
  payoutOnboardingComplete?: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const PILL_BASE =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border-transparent";

function statusPill(variant: "success" | "warning" | "info", label: string) {
  const tone =
    variant === "success"
      ? "bg-brand-success/15 text-brand-success"
      : variant === "warning"
        ? "bg-brand-warning/15 text-brand-warning"
        : "bg-primary/15 text-primary";
  return (
    <Badge variant="outline" className={cn(PILL_BASE, tone)}>
      {label}
    </Badge>
  );
}

function getStepIcon(step: string) {
  switch (step) {
    case "intro_email":
      return Mail;
    case "meeting_booked":
      return CalendarCheck;
    case "meeting_acknowledged":
      return UserCheck;
    case "peer_feedback":
      return MessageSquare;
    case "trust_score_check":
      return Shield;
    case "stripe_connect_setup":
      return Wallet;
    case "payout_released":
      return Banknote;
    default:
      return Circle;
  }
}

function getStepColor(status: WorkflowStep["status"]) {
  switch (status) {
    case "completed":
      return {
        bg: "bg-brand-success",
        ring: "ring-brand-success/20",
        text: "text-brand-foreground",
        line: "bg-brand-success",
      };
    case "current":
      return {
        bg: "bg-primary",
        ring: "ring-primary/30 ring-4 animate-pulse",
        text: "text-primary-foreground",
        line: "bg-border",
      };
    case "pending":
      return {
        bg: "bg-muted",
        ring: "",
        text: "text-muted-foreground",
        line: "bg-border",
      };
    case "skipped":
      return {
        bg: "bg-muted/50",
        ring: "",
        text: "text-muted-foreground/50",
        line: "bg-border/50",
      };
  }
}

export function WorkflowProgressTracker({
  steps,
  currentTrustScore,
  qualifiesForImmediatePayout,
  payoutAccountConnected,
  onConnectStripe,
}: {
  steps: WorkflowStep[];
  currentTrustScore?: number | null;
  qualifiesForImmediatePayout?: boolean;
  payoutAccountConnected?: boolean;
  payoutOnboardingComplete?: boolean;
  onConnectStripe?: () => void;
}) {
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const totalSteps = steps.length;
  const progressPercent =
    totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  return (
    <section className="space-y-4 rounded-2xl border border-brand-warning/15 bg-brand-warning/[0.05] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-warning/10 text-brand-warning">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Payout Progress</h4>
            <p className="text-xs text-muted-foreground">
              {completedCount} of {totalSteps} steps completed
            </p>
          </div>
        </div>
        {statusPill("warning", `${Math.round(progressPercent)}%`)}
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand-warning transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="space-y-1">
        {steps.map((step, index) => {
          const Icon = getStepIcon(step.step);
          const colors = getStepColor(step.status);
          const isLast = index === steps.length - 1;
          const isStripeConnectStep = step.step === "stripe_connect_setup";
          const isBankConnected = Boolean(payoutAccountConnected);
          const shouldShowStripeButton =
            isStripeConnectStep &&
            Boolean(onConnectStripe) &&
            (isBankConnected || step.status !== "completed");
          const stripeButtonLabel = isBankConnected
            ? "Manage Payouts"
            : "Set Up Payouts";

          return (
            <div
              key={step.step}
              className="relative"
              data-testid={`workflow-step-${step.step}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      colors.bg,
                      colors.ring,
                      colors.text
                    )}
                  >
                    {step.status === "completed" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  {!isLast && <div className={cn("h-8 w-0.5", colors.line)} />}
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        step.status === "pending"
                          ? "text-muted-foreground"
                          : "text-foreground"
                      )}
                    >
                      {step.label}
                    </p>
                    {step.status === "current" &&
                      statusPill("info", "In Progress")}
                    {step.status === "pending" &&
                      step.step === "stripe_connect_setup" &&
                      !isBankConnected &&
                      statusPill("warning", "Pending")}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                  {step.completedAt && (
                    <p className="mt-0.5 text-xs text-brand-success">
                      Completed {formatCompletionTime(step.completedAt)}
                    </p>
                  )}
                  {step.actionNeeded &&
                    (step.status === "current" ||
                      step.status === "pending") && (
                      <p className="mt-0.5 text-xs font-medium text-primary">
                        {step.actionNeeded}
                      </p>
                    )}
                  {shouldShowStripeButton && (
                    <div className="mt-2">
                      <Button
                        onClick={onConnectStripe}
                        size="sm"
                        className="bg-brand-gradient text-brand-foreground shadow-brand-cta transition-all hover:shadow-brand-cta-lg"
                      >
                        <Wallet className="mr-1.5 h-3.5 w-3.5" />
                        {stripeButtonLabel}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Alert
        className={
          qualifiesForImmediatePayout
            ? "border-brand-success/20 bg-brand-success/[0.05]"
            : "border-primary/20 bg-primary/[0.05]"
        }
      >
        <Info
          className={
            qualifiesForImmediatePayout
              ? "h-4 w-4 text-brand-success"
              : "h-4 w-4 text-primary"
          }
        />
        <AlertDescription
          className={
            qualifiesForImmediatePayout
              ? "text-xs text-brand-success"
              : "text-xs text-primary"
          }
        >
          {qualifiesForImmediatePayout ? (
            <>
              <strong>Great news!</strong> Trust score of {currentTrustScore}{" "}
              qualified you for instant payout once the meeting was confirmed.
            </>
          ) : (
            <>
              <strong>Tip:</strong> Trust score was {currentTrustScore || "N/A"}{" "}
              when this was processed. Complete more successful introductions to
              reach 8+ for instant payouts!
            </>
          )}
        </AlertDescription>
      </Alert>
    </section>
  );
}

export function PayoutDetailsContent({ payout }: { payout: PayoutRecord }) {
  const [showStripeConnectModal, setShowStripeConnectModal] = useState(false);
  const { user } = useAuth();

  const { data: stripeStatus } = useQuery({
    queryKey:
      user?.id != null
        ? getStripePayoutStatusQueryKey(user.id)
        : (["/api/stripe/payouts/status", "pending"] as const),
    queryFn: () => api.stripe.getPayoutStatus(),
    staleTime: 30 * 1000,
    enabled: user?.id != null,
  });

  const isBankAccountConnected =
    stripeStatus?.isConnected ?? Boolean(payout.payoutAccountConnected);

  const requesterName =
    payout.requester?.fullName ||
    payout.requesterName ||
    payout.requester?.email ||
    payout.requesterEmail ||
    "N/A";

  const handleStripeConnectSuccess = () => {
    setShowStripeConnectModal(false);
    // Refresh the page to reload payout data with updated Stripe status
    window.location.reload();
  };

  return (
    <div className="space-y-5">
      {/* ===== Payout Summary section ===== */}
      <section className="rounded-2xl border border-primary/15 bg-primary/[0.05] p-5">
        <h3 className="mb-4 flex items-center gap-2.5 text-base font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-background text-primary">
            <Wallet className="h-4 w-4" />
          </span>
          Payout Summary
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Introduction Details */}
          <div className="space-y-4 rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </span>
              <h4 className="text-sm font-semibold">Introduction Details</h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <span className="text-sm text-muted-foreground">Contact</span>
                <span
                  className="text-right font-medium"
                  data-testid="text-payout-contact"
                >
                  {payout.contactName}
                </span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-sm text-muted-foreground">Requester</span>
                <span
                  className="text-right font-medium"
                  data-testid="text-payout-requester"
                >
                  {requesterName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">
                  {payout.createdAt
                    ? formatLocalizedShortDateTime(payout.createdAt)
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span data-testid="badge-payout-status">
                  {payout.payoutReleased
                    ? statusPill("success", "Paid")
                    : statusPill("warning", "Pending")}
                </span>
              </div>
            </div>
          </div>

          {/* Payout Breakdown */}
          <div className="space-y-4 rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
                <DollarSign className="h-4 w-4" />
              </span>
              <h4 className="text-sm font-semibold">Payout Breakdown</h4>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Gross Earnings
                </span>
                <span className="font-medium" data-testid="text-gross-amount">
                  {formatCurrency(payout.grossAmount)}
                </span>
              </div>
              {payout.creditsApplied !== undefined &&
                payout.creditsApplied > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Credits Applied
                    </span>
                    <span
                      className="font-medium text-brand-amethyst"
                      data-testid="text-credits-applied"
                    >
                      +{formatCurrency(payout.creditsApplied)}
                    </span>
                  </div>
                )}
              <div className="flex justify-between border-t border-border pt-3">
                <span className="font-medium">
                  Your Payout
                  {payout.creditsApplied && payout.creditsApplied > 0
                    ? ""
                    : payout.isMarketplaceDeal
                      ? " (50%)"
                      : " (80%)"}
                </span>
                <span
                  className="font-semibold text-brand-success"
                  data-testid="text-net-payout"
                >
                  {formatCurrency(payout.netAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {payout.payoutReleased && (
        <section className="rounded-2xl border border-brand-success/15 bg-brand-success/[0.05] p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-success/10 text-brand-success">
                <Check className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-semibold text-foreground">
                  Payout Complete
                </h4>
                <p className="text-sm text-muted-foreground">
                  Funds have been transferred to your bank
                </p>
                {payout.payoutTriggeredBy && (
                  <p className="text-xs italic text-muted-foreground">
                    {payout.payoutTriggeredBy === "trust_score"
                      ? "Paid instantly because of your excellent track record"
                      : "Paid after the requester confirmed the meeting took place"}
                  </p>
                )}
              </div>
            </div>
            {payout.payoutReleasedAt && (
              <p
                className="text-right text-sm font-medium"
                data-testid="text-payout-date"
              >
                {formatLocalizedShortDateTime(payout.payoutReleasedAt)}
              </p>
            )}
          </div>
        </section>
      )}

      {payout.isMarketplaceDeal && (
        <section className="rounded-2xl border border-brand-sky/15 bg-brand-sky/[0.05] p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-sky/10 text-brand-sky">
              {payout.marketplaceRole === "sharer" ? (
                <Share2 className="h-5 w-5" />
              ) : (
                <Users className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">
                Marketplace Deal
              </h4>
              <p className="text-sm text-muted-foreground">
                {payout.marketplaceRole === "sharer"
                  ? "You shared this deal and earned from someone's claim"
                  : "You claimed and completed this marketplace opportunity"}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 items-center gap-4 rounded-lg border bg-card p-4">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Your Role
              </p>
              <div className="flex items-center gap-2">
                <div className="grid h-6 w-6 place-items-center rounded-full bg-brand-sky/10 text-brand-sky">
                  {payout.marketplaceRole === "sharer" ? (
                    <Share2 className="h-3.5 w-3.5" />
                  ) : (
                    <Users className="h-3.5 w-3.5" />
                  )}
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {payout.marketplaceRole === "sharer" ? "Sharer" : "Claimer"}
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Your Share (50%)
              </p>
              <p className="text-xl font-bold text-brand-sky">
                {formatCurrency(payout.netAmount)}
              </p>
            </div>
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              Marketplace deals use a 40/40 split: 40% to claimer, 40% to
              sharer.
            </p>
          </div>
        </section>
      )}

      {payout.creditsApplied !== undefined && payout.creditsApplied > 0 && (
        <section className="rounded-2xl border border-brand-amethyst/15 bg-brand-amethyst/[0.05] p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-amethyst/10 text-brand-amethyst">
              <Gift className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">
                Credit Bonus Applied
              </h4>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(payout.creditsApplied)} from your earned credits
                was applied to this payout
              </p>
              {payout.creditsRemainingAfter !== undefined && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Remaining credit balance:{" "}
                  {formatCurrency(payout.creditsRemainingAfter)}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-brand-amethyst">
                +{formatCurrency(payout.creditsApplied)}
              </span>
            </div>
          </div>
        </section>
      )}

      {payout.workflowProgress && payout.workflowProgress.length > 0 && (
        <WorkflowProgressTracker
          steps={payout.workflowProgress}
          currentTrustScore={payout.currentTrustScore}
          qualifiesForImmediatePayout={payout.qualifiesForImmediatePayout}
          payoutAccountConnected={isBankAccountConnected}
          payoutOnboardingComplete={payout.payoutOnboardingComplete}
          onConnectStripe={() => setShowStripeConnectModal(true)}
        />
      )}

      <StripeConnectModal
        isOpen={showStripeConnectModal}
        onClose={() => setShowStripeConnectModal(false)}
        onSuccess={handleStripeConnectSuccess}
      />
    </div>
  );
}
