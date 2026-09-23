export interface TrustScoreQueueJobData {
  userId: string;
  triggerEvent: string;
  evidence: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  triggeredAt: Date | string;
}

export interface TrustScoreJobResult {
  success: boolean;
  userId: string;
  triggerEvent: string;
  previousScore?: number;
  newScore?: number;
  pointsChange?: number;
  ruleId?: string;
  ruleName?: string;
  reason?: string;
  error?: string;
}

export interface FeedbackTrustScoreJobData {
  connectorId: string;
  feedbackId: string;
  requestId: string;
  triggeredAt: Date | string;
  metadata?: {
    feedbackFromUserId: string;
    rating: number;
  };
}

export interface SuccessRateTrustScoreJobData {
  connectorId: string;
  triggeredAt: Date | string;
  metadata?: {
    triggerReason: "request_completed" | "request_failed" | "scheduled_check";
    requestId?: string;
  };
}

export interface ResponseRateRecoveryJobData {
  connectorId: string;
  triggeredAt: Date | string;
  metadata?: {
    triggerReason: "connector_accepted" | "connector_declined";
    requestId?: string;
  };
}
