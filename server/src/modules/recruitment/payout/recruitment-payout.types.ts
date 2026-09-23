export interface RecruitmentPayoutJobData {
  payoutId: string;
  candidateId: string;
  jobId: string;
  recipientId: string;
  payoutType: string;
  grossAmountCents: number;
  triggeredAt: string;
}

export interface RecruitmentPayoutJobResult {
  success: boolean;
  payoutId: string;
  stripeOutboundPaymentId?: string;
  recipientAmountCents: number;
  platformAmountCents: number;
  error?: string;
}
