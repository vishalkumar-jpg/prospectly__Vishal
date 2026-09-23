export interface UnfulfilledRequest {
  id: string;
  introductionRequestId: string;
  connectorId: string;
  failureStage: string;
  failureReason: string;
  failureNotes: string | null;
  createdAt: string;
  targetName?: string;
  targetCompany?: string;
  targetPhotoUrl?: string | null;
  requesterName?: string;
  requesterCompany?: string;
  requesterPhotoUrl?: string | null;
  bountyAmount?: number;
  meetingTitle?: string | null;
  meetingDescription?: string | null;
}

export const FAILURE_REASON_LABELS: Record<string, string> = {
  no_response: "No response from prospect",
  prospect_declined: "Prospect declined",
  scheduling_issues: "Scheduling issues",
  no_show: "No show at meeting",
  invalid_email: "Invalid email address",
  other: "Other",
};

export const FAILURE_STAGE_LABELS: Record<string, string> = {
  intro_sent: "Intro Email Sent",
  meeting_booked: "Meeting Booked",
};

export interface ActiveIntroduction {
  id: string;
  requesterName: string;
  requesterCompany: string;
  requesterPhotoUrl?: string | null;
  targetName: string;
  targetCompany: string;
  targetPhotoUrl?: string | null;
  bountyAmount: number;
  stage:
    | "request_accepted"
    | "intro_sent"
    | "response_received"
    | "meeting_booked"
    | "meeting_completed"
    | "peer_feedback";
  lastActivity: string;
  lastActivityTimestamp?: string;
  nextAction: string;
  progress: number;
  meetingDate?: string;
  meetingStartTime?: string;
  meetingTimezone?: string;
  rating?: number;
  feedbackComments?: string;
  meetingTitle?: string | null;
  meetingDescription?: string | null;
  additionalContext?: string | null;
  initialChargeAmount?: number | null;
  initialChargeCaptured?: boolean;
  initialChargeCapturedAt?: string | null;
  remainingChargeAmount?: number | null;
  remainingChargeCaptured?: boolean;
  remainingChargeCapturedAt?: string | null;
  platformCommissionAmount?: number | null;
  connectorPayoutAmount?: number | null;
}
