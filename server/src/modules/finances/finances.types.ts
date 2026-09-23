export interface WorkflowData {
  introEmailSent: boolean;
  introEmailSentAt: string | null;
  meetingBooked: boolean;
  meetingBookedAt: string | null;
  meetingAcknowledged: boolean;
  peerFeedbackSubmitted: boolean;
  payoutReleased: boolean;
  payoutReleasedAt: string | null;
  payoutTriggeredBy: string | null;
  qualifiesForImmediatePayout: boolean;
  currentTrustScore: number;
  stripeConnectAccountConnected?: boolean;
  stripeConnectPayoutsEnabled?: boolean;
}
