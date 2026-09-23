import type { PayoutScope } from "@/lib/api/recruitment";
import { PayoutAmountBox } from "./PayoutStepHeader";

/**
 * Step 2 of the two-step release: the pending amount is collected, so the payout
 * can go out. The step header and the action button already say the payment is
 * done, so this shows only what is about to be sent.
 */
export function PayoutSendStep({
  scope,
  releaseAmount,
  children,
}: {
  scope: PayoutScope;
  releaseAmount: number;
  /** Connector classification rows, owned by the dialog. */
  children?: React.ReactNode;
}) {
  const recipientNoun = scope === "connector" ? "connector" : "candidate";

  return (
    <>
      {children}
      <PayoutAmountBox
        label={`Amount released to the ${recipientNoun}`}
        amount={releaseAmount}
      />
    </>
  );
}
