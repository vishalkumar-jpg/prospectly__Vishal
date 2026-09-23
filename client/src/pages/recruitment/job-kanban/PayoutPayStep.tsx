import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoneyWithCommas } from "@/lib/formatted-decimal";
import type { PayoutScope } from "@/lib/api/recruitment";
import type { PaymentMethod } from "@/hooks/usePrimaryPaymentMethod";
import { PayoutAmountBox } from "./PayoutStepHeader";
import { CancelPayoutLink } from "./PayoutModeLink";

const PAYMENT_SETTINGS_PATH = "/dashboard/settings/payments";

const SCOPE_COPY: Record<
  PayoutScope,
  { feeName: string; recipientNoun: string }
> = {
  connector: { feeName: "referral fee", recipientNoun: "connector" },
  candidate: { feeName: "success fee", recipientNoun: "candidate" },
};

/**
 * Step 1 of the two-step release: collect the pending amount owed because the
 * fee was raised after this candidate was hired. Sends nothing.
 *
 * It exists so a declined card reads as a declined card — this charge used to be
 * folded into the release request, so an insufficient-funds decline surfaced as
 * "payout failed" when no payout had been attempted at all.
 */
export function PayoutPayStep({
  scope,
  payAmount,
  releaseAmount,
  alreadyPaid,
  feeChangedNotice,
  paymentMethod,
  paymentMethodLoading,
  chargeError,
  charging,
  onSwitchToCancel,
}: {
  scope: PayoutScope;
  /** Pending amount to collect now. Always > 0 here. */
  payAmount: number;
  /** What step 2 will send out, named up front so the flow is predictable. */
  releaseAmount: number;
  /** Top-ups already collected for this candidate; 0 on a first raise. */
  alreadyPaid: number;
  /** Set when a Release was refused because the fee moved again. */
  feeChangedNotice: string | null;
  paymentMethod: PaymentMethod | null;
  paymentMethodLoading: boolean;
  /** Message from a declined charge — the payment failed, not the payout. */
  chargeError: string | null;
  charging: boolean;
  onSwitchToCancel: () => void;
}) {
  const copy = SCOPE_COPY[scope];
  const missingCard = !paymentMethodLoading && !paymentMethod;

  return (
    <>
      {/* Bounced back from a refused release: the fee moved again while the
          recruiter was on the Send step. Not an error — just more to pay. */}
      {feeChangedNotice && (
        <div className="flex items-start gap-2.5 rounded-xl border border-brand-warning/30 bg-brand-warning/10 p-3.5 text-[12.5px] text-brand-warning">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{feeChangedNotice}</span>
        </div>
      )}

      {alreadyPaid > 0 ? (
        // A repeat top-up. Say what was already collected first, or the
        // recruiter reasonably reads this as being charged twice for one raise.
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          You&rsquo;ve already paid{" "}
          <b className="font-bold text-foreground">
            ${formatMoneyWithCommas(alreadyPaid)}
          </b>{" "}
          toward this payout. The {copy.feeName} went up again, so a further{" "}
          <b className="font-bold text-foreground">
            ${formatMoneyWithCommas(payAmount)}
          </b>{" "}
          is due before the {copy.recipientNoun} payout can be released.
        </p>
      ) : (
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          The {copy.feeName} was increased after this hire, so a pending amount
          of{" "}
          <b className="font-bold text-foreground">
            ${formatMoneyWithCommas(payAmount)}
          </b>{" "}
          is due from your side. This amount must be paid before the{" "}
          {copy.recipientNoun} payout can be released.
        </p>
      )}

      <PayoutAmountBox
        label="Pending amount to pay now"
        amount={payAmount}
        tone="warn"
      />

      {missingCard && (
        <div className="rounded-xl border border-brand-destructive/25 bg-brand-destructive/10 p-4">
          <div className="flex items-start gap-2.5 text-[12.5px]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-destructive" />
            <p className="leading-relaxed text-muted-foreground">
              <span className="font-extrabold text-brand-destructive">
                No card on file.
              </span>{" "}
              Add a card to pay this amount. Nothing has been charged and
              nothing has been sent.
            </p>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              asChild
              size="sm"
              className="bg-brand-gradient text-brand-foreground shadow-brand-cta hover:shadow-brand-cta-lg"
            >
              <Link to={PAYMENT_SETTINGS_PATH}>Add a Card</Link>
            </Button>
          </div>
        </div>
      )}

      {/* A declined charge stays on this step and says exactly what did and
          didn't happen — the whole reason this was split out of the release. */}
      {chargeError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-brand-destructive/25 bg-brand-destructive/10 p-3.5 text-[12.5px]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-destructive" />
          <div className="space-y-2">
            <span className="text-muted-foreground">
              <b className="font-extrabold text-brand-destructive">
                Payment didn&rsquo;t go through.
              </b>{" "}
              {chargeError}
            </span>
            <div>
              <Link
                to={PAYMENT_SETTINGS_PATH}
                className="text-[11.5px] font-semibold text-brand-amethyst underline"
              >
                Update payment method
              </Link>
            </div>
          </div>
        </div>
      )}

      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        After the payment succeeds, you&rsquo;ll move to{" "}
        <b className="font-bold text-foreground">Step 2</b> to release the $
        {formatMoneyWithCommas(releaseAmount)} payout. If the payment fails,
        nothing is released and you can try again.
        {!paymentMethodLoading && paymentMethod && (
          <>
            {" "}
            Paying with{" "}
            <b className="font-bold uppercase text-foreground">
              {paymentMethod.brand}
            </b>{" "}
            •••• {paymentMethod.last4}.
          </>
        )}
      </p>

      {!charging && <CancelPayoutLink onClick={onSwitchToCancel} />}
    </>
  );
}
