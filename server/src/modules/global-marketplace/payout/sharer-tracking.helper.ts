import { buildWorkflowProgress } from "modules/finances/finances.helpers";
import { IntroductionStatus } from "modules/introductions/introductions.constants";

interface RequestData {
  id: string;
  status: string;
  contactName: string;
  bountyAmount: string;
  connectorFeedbackSubmitted: boolean | null;
}

interface TransactionData {
  id: string;
}

interface PayoutData {
  payoutReleased: boolean;
  payoutReleasedAt: Date | null;
  payoutTriggeredBy: string | null;
  trustScoreAtPayout: number | null;
}

interface PaymentStage {
  stageName: string;
  capturedAt: Date | null;
}

export function assembleSharerTrackingDetails(
  request: RequestData,
  transaction: TransactionData | null,
  payout: PayoutData | null,
  paymentStages: PaymentStage[]
): {
  workflowProgress: Array<{
    step: string;
    label: string;
    description: string;
    status: string;
    completedAt: string | null;
    actionNeeded: string | null;
  }>;
  currentTrustScore: number | null;
  qualifiesForImmediatePayout: boolean;
} {
  const initialStage = paymentStages.find(
    (s) => s.stageName === "intro_email_sent"
  );
  const remainingStage = paymentStages.find(
    (s) => s.stageName === "meeting_booked"
  );

  const introEmailSent = !!initialStage?.capturedAt;
  const meetingBooked = !!remainingStage?.capturedAt;

  // Determine meeting acknowledged and peer feedback status from request status
  const { status } = request;
  const meetingAcknowledged =
    status === IntroductionStatus.PEER_FEEDBACK ||
    status === IntroductionStatus.COMPLETED ||
    status === IntroductionStatus.MEETING_COMPLETED;
  const peerFeedbackSubmitted =
    request.connectorFeedbackSubmitted ||
    status === IntroductionStatus.COMPLETED;

  // Get trust score (for sharer, we'll use a default or get from payout history)
  const historicalTrustScore = payout?.trustScoreAtPayout;
  // For sharers, we don't have a trust score, so use null or default
  const currentTrustScore = historicalTrustScore ?? null;
  const qualifiesForImmediatePayout =
    currentTrustScore !== null && currentTrustScore >= 90;

  // Build workflow progress
  const workflowProgress = buildWorkflowProgress({
    introEmailSent,
    introEmailSentAt: initialStage?.capturedAt?.toISOString() || null,
    meetingBooked,
    meetingBookedAt: remainingStage?.capturedAt?.toISOString() || null,
    meetingAcknowledged,
    peerFeedbackSubmitted,
    payoutReleased: payout?.payoutReleased || false,
    payoutReleasedAt: payout?.payoutReleasedAt?.toISOString() || null,
    payoutTriggeredBy: payout?.payoutTriggeredBy || null,
    currentTrustScore: currentTrustScore ?? 0,
    qualifiesForImmediatePayout,
  });

  return {
    workflowProgress,
    currentTrustScore,
    qualifiesForImmediatePayout,
  };
}
