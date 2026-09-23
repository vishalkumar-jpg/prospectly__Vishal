import { MarketplacePayoutRole } from "./marketplace-payout.constants";

export interface MarketplacePayoutSplit {
  totalCents: number;
  platformCents: number;
  claimerCents: number;
  sharerCents: number;
}

export interface PayoutJobData {
  introductionRequestId: string;
  transactionId?: string;
}

export interface PayoutJobResult {
  success: boolean;
  introductionRequestId: string;
  claimerPayoutId?: string;
  sharerPayoutId?: string;
  claimerAmount?: number;
  sharerAmount?: number;
  error?: string;
}

export interface CreatePayoutRecordParams {
  userId: string;
  introductionRequestId: string;
  amount: number;
  role: MarketplacePayoutRole;
  stripeOutboundPaymentId?: string;
}

export interface PayoutHistoryRecord {
  id: string;
  userId: string;
  introductionRequestId: string;
  status: string;
  isMarketplaceDeal: boolean;
  marketplaceRole: MarketplacePayoutRole | null;
  createdAt: Date;
}

export interface MarketplaceDealInfo {
  introductionRequestId: string;
  introductionTransactionId: string;
  claimerId: string;
  sharerId: string;
  bountyAmount: number;
  requesterId: string;
}
