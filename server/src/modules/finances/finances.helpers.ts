import {
  WorkflowStepEnum,
  WorkflowStatusEnum,
  PayoutTriggerEnum,
  FINANCES_DESCRIPTIONS,
} from "./finances.constants";
import { RefundInfoDto, WorkflowStepDto } from "./finances.response";
import { WorkflowData } from "./finances.types";

const POST_REFUND_STAGE_STATUSES = [
  "refund_initiated",
  "refunded",
  "refund_failed",
] as const;

export const REFUND_STATUSES_COUNTED_IN_TOTAL = [
  "refunded",
  "refund_initiated",
] as const;

export function isPostRefundStageStatus(status: string): boolean {
  return (POST_REFUND_STAGE_STATUSES as readonly string[]).includes(status);
}

/** Timeline amount: refund value when stage is refund-related, else milestone capture. */
export function paymentEventDisplayAmount(
  milestoneAmount: number,
  stageName: string,
  stageStatus: string,
  refunds: RefundInfoDto[]
): number {
  if (!isPostRefundStageStatus(stageStatus)) {
    return milestoneAmount;
  }
  const refund = refunds.find((r) => r.stageName === stageName);
  return refund?.refundAmount ?? milestoneAmount;
}

export function captureEventDescription(
  baseDescription: string,
  stageName: string,
  stageStatus: string,
  refunds: RefundInfoDto[]
): string {
  if (!isPostRefundStageStatus(stageStatus)) {
    return baseDescription;
  }
  const refund = refunds.find((r) => r.stageName === stageName);
  if (!refund) {
    return baseDescription;
  }
  return FINANCES_DESCRIPTIONS.REFUND_MILESTONE_DESCRIPTION(
    refund.refundAmount
  );
}

export function buildWorkflowProgress(data: WorkflowData): WorkflowStepDto[] {
  const steps: WorkflowStepDto[] = [];

  const determineStatus = (
    isComplete: boolean,
    previousComplete: boolean
  ):
    | WorkflowStatusEnum.COMPLETED
    | WorkflowStatusEnum.CURRENT
    | WorkflowStatusEnum.PENDING => {
    if (isComplete) return WorkflowStatusEnum.COMPLETED;
    if (previousComplete) return WorkflowStatusEnum.CURRENT;
    return WorkflowStatusEnum.PENDING;
  };

  steps.push({
    step: WorkflowStepEnum.INTRO_EMAIL,
    label: FINANCES_DESCRIPTIONS.INTRO_EMAIL_SENT_LABEL,
    description: FINANCES_DESCRIPTIONS.INTRO_EMAIL_SENT_DESC,
    status: determineStatus(data.introEmailSent, true),
    completedAt: data.introEmailSentAt,
    actionNeeded: !data.introEmailSent
      ? FINANCES_DESCRIPTIONS.WAITING_FOR_EMAIL
      : null,
  });

  steps.push({
    step: WorkflowStepEnum.MEETING_BOOKED,
    label: FINANCES_DESCRIPTIONS.MEETING_BOOKED_LABEL,
    description: FINANCES_DESCRIPTIONS.MEETING_BOOKED_DESC,
    status: determineStatus(data.meetingBooked, data.introEmailSent),
    completedAt: data.meetingBookedAt,
    actionNeeded:
      data.introEmailSent && !data.meetingBooked
        ? FINANCES_DESCRIPTIONS.WAITING_FOR_BOOKING
        : null,
  });

  steps.push({
    step: WorkflowStepEnum.MEETING_ACKNOWLEDGED,
    label: FINANCES_DESCRIPTIONS.MEETING_COMPLETED_LABEL,
    description: FINANCES_DESCRIPTIONS.MEETING_COMPLETED_DESC,
    status: determineStatus(data.meetingAcknowledged, data.meetingBooked),
    completedAt: null,
    actionNeeded:
      data.meetingBooked && !data.meetingAcknowledged
        ? FINANCES_DESCRIPTIONS.WAITING_FOR_CONFIRMATION
        : null,
  });

  // If payout is already released, use the actual trigger method to determine which step to show
  // Otherwise, use current trust score to determine eligibility
  const wasTriggeredByTrustScore =
    data.payoutReleased &&
    data.payoutTriggeredBy === PayoutTriggerEnum.TRUST_SCORE;
  const wasTriggeredByFeedback =
    data.payoutReleased &&
    data.payoutTriggeredBy === PayoutTriggerEnum.PEER_FEEDBACK;
  const showTrustScoreStep =
    wasTriggeredByTrustScore ||
    (!data.payoutReleased && data.qualifiesForImmediatePayout);
  const showPeerFeedbackStep =
    wasTriggeredByFeedback ||
    (!data.payoutReleased && !data.qualifiesForImmediatePayout);

  if (showPeerFeedbackStep) {
    steps.push({
      step: WorkflowStepEnum.PEER_FEEDBACK,
      label: FINANCES_DESCRIPTIONS.PEER_FEEDBACK_LABEL,
      description: data.payoutReleased
        ? FINANCES_DESCRIPTIONS.TRUST_SCORE_WAS(data.currentTrustScore)
        : FINANCES_DESCRIPTIONS.TRUST_SCORE_IS(data.currentTrustScore),
      status: determineStatus(
        data.peerFeedbackSubmitted || data.payoutReleased,
        data.meetingAcknowledged
      ),
      completedAt: null,
      actionNeeded:
        data.meetingAcknowledged &&
        !data.peerFeedbackSubmitted &&
        !data.payoutReleased
          ? FINANCES_DESCRIPTIONS.WAITING_FOR_FEEDBACK
          : null,
    });
  } else if (showTrustScoreStep) {
    steps.push({
      step: WorkflowStepEnum.TRUST_SCORE_CHECK,
      label: FINANCES_DESCRIPTIONS.TRUST_SCORE_VERIFIED_LABEL,
      description: data.payoutReleased
        ? FINANCES_DESCRIPTIONS.TRUST_SCORE_WAS_INSTANT(data.currentTrustScore)
        : FINANCES_DESCRIPTIONS.TRUST_SCORE_QUALIFIES(data.currentTrustScore),
      status: data.meetingAcknowledged
        ? WorkflowStatusEnum.COMPLETED
        : WorkflowStatusEnum.PENDING,
      completedAt: null,
      actionNeeded: null,
    });
  }

  // Add Stripe Connect Setup step ONLY if payout is not released AND Stripe is not connected
  // Once Stripe is connected, this step should not appear in the timeline at all
  if (!data.stripeConnectAccountConnected) {
    steps.push({
      step: WorkflowStepEnum.STRIPE_CONNECT_SETUP,
      label: FINANCES_DESCRIPTIONS.STRIPE_CONNECT_SETUP_LABEL,
      description: FINANCES_DESCRIPTIONS.STRIPE_CONNECT_SETUP_DESC,
      status: WorkflowStatusEnum.PENDING,
      completedAt: null,
      actionNeeded: null,
    });
  }

  steps.push({
    step: WorkflowStepEnum.PAYOUT_RELEASED,
    label: FINANCES_DESCRIPTIONS.PAYOUT_RELEASED_LABEL,
    description: FINANCES_DESCRIPTIONS.PAYOUT_RELEASED_DESC,
    status: data.payoutReleased
      ? WorkflowStatusEnum.COMPLETED
      : WorkflowStatusEnum.PENDING,
    completedAt: data.payoutReleasedAt,
    actionNeeded: null,
  });

  return steps;
}
