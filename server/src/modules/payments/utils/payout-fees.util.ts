/**
 * Payout Fee Calculation
 *
 * Computes the standard + cross-border + FX fees for a Global Payout and the
 * net amount the recipient receives after they are deducted. All money is in
 * cents to avoid floating-point drift.
 *
 * Reverting to "platform bears the fees" is a single config flag
 * ({@link DEDUCT_PAYOUT_FEES_FROM_RECIPIENT}) — see payout-fees.config.ts.
 */

import {
  DEDUCT_PAYOUT_FEES_FROM_RECIPIENT,
  PAYOUT_FEE_RATES,
  PayoutFeeRates,
} from "config/payout-fees.config";
import {
  isSupportedPayoutCountry,
  PayoutCountryCode,
} from "config/payment.config";

export interface PayoutFeeBreakdown {
  /** Recipient's earned amount before fees (cents). */
  grossCents: number;
  standardFeeCents: number;
  crossBorderFeeCents: number;
  fxFeeCents: number;
  /** Sum of all fee components (cents), regardless of who bears them. */
  totalFeeCents: number;
  /** Whether the fees are deducted from the recipient (vs borne by platform). */
  feesAppliedToRecipient: boolean;
  /** Amount actually deducted from the recipient (cents). 0 when platform bears. */
  deductedFeeCents: number;
  /** Amount actually sent to the recipient (cents) — the OutboundPayment amount. */
  netCents: number;
  /** True when fees meet/exceed the payout and it must be blocked for review. */
  feesExceedPayout: boolean;
  country: PayoutCountryCode;
  rates: PayoutFeeRates;
}

/**
 * Stripe's fee (in cents) on a given OUTBOUND (sent) amount, modelled with the
 * same per-component cent rounding Stripe applies. Platform cost for a payout is
 * `sentCents + stripeFeeCents(sentCents)`.
 */
function stripeFeeCents(
  sentCents: number,
  rates: { standardFeeCents: number; crossBorderPct: number; fxPct: number }
): number {
  return (
    rates.standardFeeCents +
    Math.round(sentCents * rates.crossBorderPct) +
    Math.round(sentCents * rates.fxPct)
  );
}

/**
 * Calculates the payout fee breakdown for a recipient's gross payout amount.
 *
 * Because Stripe charges its fee on the amount we SEND (platform cost =
 * `net + stripeFeeCents(net)`), we converge on the largest integer `net` whose
 * platform cost is `<= gross`. This hits the gross exactly to the cent when
 * achievable and never over-pays otherwise (≤1¢ residual stays with the
 * platform). When {@link DEDUCT_PAYOUT_FEES_FROM_RECIPIENT} is false, the
 * components are still computed (for reporting) but nothing is deducted.
 *
 * @param grossCents recipient's earned amount in cents (must be a positive int)
 * @param country recipient's ISO alpha-2 payout country (defaults to US rates)
 */
export function calculatePayoutFees(
  grossCents: number,
  country?: string | null
): PayoutFeeBreakdown {
  const code: PayoutCountryCode = isSupportedPayoutCountry(country)
    ? (country.toUpperCase() as PayoutCountryCode)
    : "US";
  const rates = PAYOUT_FEE_RATES[code];

  const safeGross = Math.max(0, Math.round(grossCents));
  const { standardFeeCents } = rates;
  const pct = rates.crossBorderPct + rates.fxPct;
  const feesAppliedToRecipient = DEDUCT_PAYOUT_FEES_FROM_RECIPIENT;

  // ── Platform bears the fees (revert mode) ────────────────────────────────
  // Send the full amount; record the estimated fee on the gross for reporting
  // (Stripe will still bill the platform its own fee on the sent amount).
  if (!feesAppliedToRecipient) {
    const crossBorderFeeCents = Math.ceil(safeGross * rates.crossBorderPct);
    const fxFeeCents = Math.ceil(safeGross * rates.fxPct);
    return {
      grossCents: safeGross,
      standardFeeCents,
      crossBorderFeeCents,
      fxFeeCents,
      totalFeeCents: standardFeeCents + crossBorderFeeCents + fxFeeCents,
      feesAppliedToRecipient: false,
      deductedFeeCents: 0,
      netCents: safeGross,
      feesExceedPayout: false,
      country: code,
      rates,
    };
  }

  // ── Recipient bears the fees: converge on the largest `net` such that
  //    `net + stripeFeeCents(net) <= gross`, so the amount we send PLUS Stripe's
  //    fee on THAT amount reconciles to the gross (exact to the cent when
  //    possible; never over). Seed with the closed-form inverse, then adjust.
  let netCents = Math.floor((safeGross - standardFeeCents) / (1 + pct));
  const MAX_ITER = 16;
  for (
    let i = 0;
    i < MAX_ITER &&
    netCents > 0 &&
    netCents + stripeFeeCents(netCents, rates) > safeGross;
    i++
  ) {
    netCents--;
  }
  for (
    let i = 0;
    i < MAX_ITER &&
    netCents + 1 + stripeFeeCents(netCents + 1, rates) <= safeGross;
    i++
  ) {
    netCents++;
  }

  // Block-on-edge: fees meet/exceed the payout (gross ≤ standard fee).
  if (netCents <= 0) {
    const crossBorderFeeCents = Math.ceil(safeGross * rates.crossBorderPct);
    const fxFeeCents = Math.ceil(safeGross * rates.fxPct);
    return {
      grossCents: safeGross,
      standardFeeCents,
      crossBorderFeeCents,
      fxFeeCents,
      totalFeeCents: standardFeeCents + crossBorderFeeCents + fxFeeCents,
      feesAppliedToRecipient: true,
      deductedFeeCents: 0,
      netCents: safeGross,
      feesExceedPayout: true,
      country: code,
      rates,
    };
  }

  // Recipient-borne fee = gross − net (≡ Stripe's fee on `net`). Split into
  // components for the breakdown; fx absorbs the rounding so they sum exactly.
  const totalFeeCents = safeGross - netCents;
  const crossBorderFeeCents = Math.round(netCents * rates.crossBorderPct);
  const fxFeeCents = totalFeeCents - standardFeeCents - crossBorderFeeCents;

  return {
    grossCents: safeGross,
    standardFeeCents,
    crossBorderFeeCents,
    fxFeeCents,
    totalFeeCents,
    feesAppliedToRecipient: true,
    deductedFeeCents: totalFeeCents,
    netCents,
    feesExceedPayout: false,
    country: code,
    rates,
  };
}
