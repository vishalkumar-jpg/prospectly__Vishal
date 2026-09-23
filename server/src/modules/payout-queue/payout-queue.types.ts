export interface TrustScorePayoutJobData {
  requestId: string;
  connectorId: string;
  bountyAmount: number;
  triggeredAt: string;
}

export interface FeedbackPayoutJobData {
  requestId: string;
  connectorId: string;
  bountyAmount: number;
  triggeredAt: string;
}

export type PayoutJobData = TrustScorePayoutJobData | FeedbackPayoutJobData;

export interface PayoutJobResult {
  success: boolean;
  requestId: string;
  outboundPaymentId?: string;
  connectorAmountCents: number;
  platformAmountCents: number;
  error?: string;
}
