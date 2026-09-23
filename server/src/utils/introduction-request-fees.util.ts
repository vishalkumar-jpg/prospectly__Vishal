import {
  calculateSplitAmounts,
  convertToDollars,
} from "modules/payments/utils/payment-calculations.util";
import type { RequesterCardFeeBreakdown } from "./requester-card-fee.util";
import { calculateRequesterCardFees } from "./requester-card-fee.util";

export interface RequesterMilestoneStageAmounts {
  initialStageAmount?: string | number | null;
  remainingStageAmount?: string | number | null;
}

export interface RequesterMilestoneAmounts {
  initialChargeAmount: number;
  remainingChargeAmount: number;
}

export interface IntroductionRequestFeeRow {
  bountyAmount?: string | number | null;
  providerFee?: string | number | null;
  processingFee?: string | number | null;
  totalAmount?: string | number | null;
}

export interface IntroductionRequestPricingRow {
  bountyAmount?: string | number | null;
  providerFee?: string | number | null;
  processingFee?: string | number | null;
  totalAmount?: string | number | null;
}

export function normalizeIntroductionRequestPricing(
  pricing:
    | IntroductionRequestPricingRow
    | IntroductionRequestPricingRow[]
    | null
    | undefined
): IntroductionRequestPricingRow | null {
  if (!pricing) return null;
  return Array.isArray(pricing) ? (pricing[0] ?? null) : pricing;
}

export function toIntroductionFeeRow(
  request: { bountyAmount?: string | number | null },
  pricing?:
    | IntroductionRequestPricingRow
    | IntroductionRequestPricingRow[]
    | null
): IntroductionRequestFeeRow {
  const normalized = normalizeIntroductionRequestPricing(pricing);
  return {
    bountyAmount: normalized?.bountyAmount ?? request.bountyAmount,
    providerFee: normalized?.providerFee,
    processingFee: normalized?.processingFee,
    totalAmount: normalized?.totalAmount,
  };
}

export function mergeRequesterFeeFields(
  request: { bountyAmount?: string | number | null },
  pricing?:
    | IntroductionRequestPricingRow
    | IntroductionRequestPricingRow[]
    | null
): {
  providerFee: string;
  processingFee: string;
  totalAmount: string;
} {
  const row = toIntroductionFeeRow(
    request,
    normalizeIntroductionRequestPricing(pricing)
  );
  return {
    providerFee: String(row.providerFee ?? "0"),
    processingFee: String(row.processingFee ?? "0"),
    totalAmount: String(row.totalAmount ?? "0"),
  };
}

export interface StoredRequesterFees {
  bountyAmount: number;
  providerFee: number;
  processingFee: number;
  totalAmount: number;
}

function parseNumeric(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : 0;
}

export function hasStoredRequesterFees(
  row: IntroductionRequestFeeRow
): boolean {
  return parseNumeric(row.totalAmount) > 0;
}

export function getStoredRequesterFees(
  row: IntroductionRequestFeeRow
): StoredRequesterFees | null {
  if (!hasStoredRequesterFees(row)) {
    return null;
  }

  const totalAmount = parseNumeric(row.totalAmount);
  const providerFee = parseNumeric(row.providerFee);
  const processingFee = parseNumeric(row.processingFee);
  const bountyAmount = parseNumeric(row.bountyAmount);

  return {
    bountyAmount,
    providerFee,
    processingFee,
    totalAmount,
  };
}

/** Fee snapshot for persisting on introduction_request_prices rows. */
export function feesFromBounty(
  bountyAmountDollars: number | string
): RequesterCardFeeBreakdown {
  return calculateRequesterCardFees(bountyAmountDollars);
}

/**
 * 5% / 95% milestone display amounts.
 * New fee model: split on inclusive total_amount (not bounty).
 * Legacy: payment_stages amounts when both present, else bounty split.
 */
export function getRequesterMilestoneAmounts(
  row: IntroductionRequestFeeRow,
  stageAmounts?: RequesterMilestoneStageAmounts
): RequesterMilestoneAmounts {
  const stored = getStoredRequesterFees(row);
  if (stored) {
    const split = calculateSplitAmounts(stored.totalAmount);
    return {
      initialChargeAmount: convertToDollars(split.initialAmountCents),
      remainingChargeAmount: convertToDollars(split.remainingAmountCents),
    };
  }

  const initialFromStage = parseNumeric(stageAmounts?.initialStageAmount);
  const remainingFromStage = parseNumeric(stageAmounts?.remainingStageAmount);
  if (initialFromStage > 0 && remainingFromStage > 0) {
    return {
      initialChargeAmount: initialFromStage,
      remainingChargeAmount: remainingFromStage,
    };
  }

  const bounty = parseNumeric(row.bountyAmount);
  const split = calculateSplitAmounts(bounty > 0 ? bounty : 0.01);
  return {
    initialChargeAmount: convertToDollars(split.initialAmountCents),
    remainingChargeAmount: convertToDollars(split.remainingAmountCents),
  };
}
