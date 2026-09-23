import { ArrowLeft } from "lucide-react";

const LINK_BASE =
  "text-[11.5px] font-semibold underline underline-offset-2 transition-opacity hover:opacity-80";

/**
 * Switches the release dialog into cancellation mode. Destructive-coloured
 * because that is where it leads — cancelling a payout is not reversible.
 */
export function CancelPayoutLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${LINK_BASE} text-brand-destructive`}
    >
      Need to cancel this payout instead?
    </button>
  );
}

/**
 * Returns from cancellation mode to releasing. Muted rather than destructive —
 * backing out of the cancel path is the safe direction.
 */
export function BackToReleaseLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${LINK_BASE} inline-flex items-center gap-1 text-muted-foreground hover:text-foreground`}
    >
      <ArrowLeft className="h-3 w-3" />
      Back to releasing
    </button>
  );
}
