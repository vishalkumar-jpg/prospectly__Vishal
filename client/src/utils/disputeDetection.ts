import { differenceInHours, differenceInDays } from "date-fns";
import { utcDayjs } from "@/lib/dayjs";

export interface DetectedIssue {
  type:
    | "meeting_no_show"
    | "payment_delay"
    | "no_response"
    | "bounty_discrepancy"
    | "stale_introduction";
  severity: "low" | "medium" | "high";
  message: string;
  suggestedAction: string;
  disputeType?: string;
}

interface IntroductionData {
  id: string;
  stage: string;
  status?: string;
  meetingDate?: string;
  lastActivity: string;
  bountyAmount: number;
  agreedBountyAmount?: number;
  paymentStatus?: string;
  payoutStatus?: string;
  paidAt?: string;
  paidOutAt?: string;
  createdAt?: string;
}

function detectMeetingNoShowIssue({
  intro,
  nowDate,
}: {
  intro: IntroductionData;
  nowDate: Date;
}): DetectedIssue | null {
  if (intro.stage !== "meeting_booked" || !intro.meetingDate) return null;

  const meetingDate = utcDayjs(intro.meetingDate).toDate();
  const hoursSinceMeeting = differenceInHours(nowDate, meetingDate);
  if (hoursSinceMeeting < 48) return null;

  return {
    type: "meeting_no_show",
    severity: "high",
    message: "Meeting was scheduled 48+ hours ago but no update on completion",
    suggestedAction: "Verify if meeting occurred and update status",
    disputeType: "meeting_no_show",
  };
}

function detectPaymentDelayIssue({
  intro,
  nowDate,
}: {
  intro: IntroductionData;
  nowDate: Date;
}): DetectedIssue | null {
  if (
    intro.stage !== "meeting_completed" ||
    intro.paymentStatus !== "paid" ||
    intro.paidOutAt
  ) {
    return null;
  }

  const paidDate = intro.paidAt ? utcDayjs(intro.paidAt).toDate() : null;
  if (!paidDate || Number.isNaN(paidDate.getTime())) return null;

  const daysSincePayment = differenceInDays(nowDate, paidDate);
  if (daysSincePayment < 7) return null;

  return {
    type: "payment_delay",
    severity: "high",
    message: `Payment was made ${daysSincePayment} days ago but connector hasn't been paid out`,
    suggestedAction: "Contact support about delayed payout",
    disputeType: "payment_not_received",
  };
}

function detectNoResponseIssue({
  intro,
  nowDate,
}: {
  intro: IntroductionData;
  nowDate: Date;
}): DetectedIssue | null {
  if (intro.stage !== "intro_sent" || !intro.createdAt) return null;

  const createdDate = utcDayjs(intro.createdAt).toDate();
  const daysSinceIntro = differenceInDays(nowDate, createdDate);
  if (daysSinceIntro < 7) return null;

  return {
    type: "no_response",
    severity: "medium",
    message: `Introduction was sent ${daysSinceIntro} days ago with no prospect response`,
    suggestedAction: "Review contact quality or follow up with connector",
    disputeType: "service_quality",
  };
}

function detectBountyDiscrepancyIssue({
  intro,
}: {
  intro: IntroductionData;
}): DetectedIssue | null {
  if (!intro.agreedBountyAmount) return null;
  if (intro.bountyAmount === intro.agreedBountyAmount) return null;

  return {
    type: "bounty_discrepancy",
    severity: "high",
    message: `Referral payout amount ($${intro.bountyAmount}) differs from agreed amount ($${intro.agreedBountyAmount})`,
    suggestedAction: "File a dispute to resolve amount discrepancy",
    disputeType: "bounty_incorrect",
  };
}

function detectStaleIntroductionIssue({
  intro,
  nowDate,
}: {
  intro: IntroductionData;
  nowDate: Date;
}): DetectedIssue | null {
  if (!["request_accepted", "intro_sent"].includes(intro.stage)) return null;
  if (!intro.createdAt) return null;

  const createdDate = utcDayjs(intro.createdAt).toDate();
  const daysSinceCreation = differenceInDays(nowDate, createdDate);
  if (daysSinceCreation < 14) return null;

  return {
    type: "stale_introduction",
    severity: "low",
    message: `Introduction has been in ${intro.stage} stage for ${daysSinceCreation} days`,
    suggestedAction: "Follow up with connector or consider cancellation",
    disputeType: "service_quality",
  };
}

/**
 * Detects potential dispute-worthy issues in an introduction
 */
export function detectIntroductionIssues(
  intro: IntroductionData
): DetectedIssue | null {
  const nowDate = utcDayjs().toDate();

  return (
    detectMeetingNoShowIssue({ intro, nowDate }) ??
    detectPaymentDelayIssue({ intro, nowDate }) ??
    detectNoResponseIssue({ intro, nowDate }) ??
    detectBountyDiscrepancyIssue({ intro }) ??
    detectStaleIntroductionIssue({ intro, nowDate })
  );
}

/**
 * Determines if an introduction is eligible for filing a dispute
 */
export function canFileDispute(intro: IntroductionData): boolean {
  const eligibleStages = [
    "intro_sent",
    "meeting_booked",
    "meeting_completed",
    "peer_feedback",
  ];
  const eligibleStatuses = ["declined", "expired"];

  return (
    eligibleStages.includes(intro.stage) ||
    (intro.status !== undefined && eligibleStatuses.includes(intro.status))
  );
}

/**
 * Calculates issue severity score (0-100, higher = more severe)
 */
export function calculateIssueSeverity(issue: DetectedIssue): number {
  const severityScores = {
    high: 85,
    medium: 50,
    low: 25,
  };

  return severityScores[issue.severity];
}

/**
 * Generates a dispute pre-fill object based on detected issue
 */
export function generateDisputePreFill(
  intro: IntroductionData,
  issue: DetectedIssue
) {
  return {
    introduction_request_id: intro.id,
    dispute_type: issue.disputeType || "other",
    description: `${issue.message}\n\nDetected automatically by the system. ${issue.suggestedAction}`,
    disputed_amount: intro.bountyAmount,
    priority: issue.severity,
  };
}
