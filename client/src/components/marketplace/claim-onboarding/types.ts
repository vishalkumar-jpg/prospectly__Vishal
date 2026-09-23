export interface ClaimIntroductionInfo {
  requestId: string;
  prospectName: string;
  prospectCompany?: string;
  bountyAmount: number;
  claimerShare: number;
  connectorName?: string;
}

export type ClaimRequestInfo = ClaimIntroductionInfo;

/** @deprecated Use ClaimRequestInfo instead */
export type ClaimDealInfo = ClaimIntroductionInfo;

export type StepStatus = "pending" | "in_progress" | "completed" | "failed";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  icon: React.ElementType;
  action?: () => void;
  actionLabel?: string;
  failureReason?: string;
}
