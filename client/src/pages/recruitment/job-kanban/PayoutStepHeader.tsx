import { cn } from "@/lib/utils";
import { formatMoneyWithCommas } from "@/lib/formatted-decimal";

/**
 * Which step of the two-step release the recruiter is on. The amounts are shown
 * by the step bodies and the action button, so this stays a single line.
 */
export function PayoutStepHeader({
  paid,
}: {
  /** The pending amount has been collected — step 2 is unlocked. */
  paid: boolean;
}) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
      Step {paid ? "2" : "1"} of 2 &mdash;{" "}
      {paid ? "Release payout" : "Pay pending amount"}
    </p>
  );
}

/**
 * Amount callout. `warn` marks money the recruiter still owes; the plain tone is
 * for money on its way out to the recipient.
 */
export function PayoutAmountBox({
  label,
  amount,
  tone = "neutral",
}: {
  label: string;
  amount: number;
  tone?: "neutral" | "warn";
}) {
  const isWarn = tone === "warn";
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border px-4 py-3",
        isWarn
          ? "border-brand-warning/30 bg-brand-warning/10"
          : "border-border bg-muted/30"
      )}
    >
      <span className="text-[12.5px] font-semibold text-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-[17px] font-extrabold tabular-nums",
          isWarn ? "text-brand-warning" : "text-foreground"
        )}
      >
        ${formatMoneyWithCommas(amount)}
      </span>
    </div>
  );
}
