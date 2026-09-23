export interface Dispute {
  id: string;
  introductionRequestId: string;
  filedByUserId: string;
  disputeType: DisputeType;
  disputeCategory: DisputeCategory;
  priority: "low" | "medium" | "high";
  status: DisputeStatus;
  reason: string;
  expectedOutcome?: string;
  evidenceUrls?: string[];
  disputedAmount?: number;
  requestedRefundAmount?: number;
  againstUserId?: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionAction?: ResolutionAction;
  createdAt: string;
  updatedAt: string;
  introductionTitle?: string;
  contactName?: string;
  againstUserName?: string;
  againstUserEmail?: string;
}

export type DisputeType =
  | "service_quality"
  | "meeting_no_show"
  | "meeting_cancelled"
  | "unprofessional_conduct"
  | "other";

export type DisputeCategory = "payment" | "service" | "conduct" | "technical";

export type DisputeStatus =
  | "pending"
  | "under_review"
  | "resolved"
  | "rejected";

export type ResolutionAction =
  | "refund"
  | "credit"
  | "no_action"
  | "partial_refund";

export const DISPUTE_TYPES = [
  "service_quality",
  "meeting_no_show",
  "meeting_cancelled",
  "unprofessional_conduct",
  "other",
] as const;

export interface IntroductionForDispute {
  id: string;
  contactName: string;
  meetingTitle: string;
  bountyAmount: string | number;
  status: string;
  createdAt: string;
  contactOwnerId: string | null;
  requesterId: string | null;
  meetingDuration: string | null;
  paymentStatus: string | null;
  userRole: "requester" | "connector";
}

export const DISPUTE_TYPE_LABELS: Record<DisputeType, string> = {
  service_quality: "Service Quality Issue",
  meeting_no_show: "Meeting No-Show",
  meeting_cancelled: "Meeting Cancelled",
  unprofessional_conduct: "Unprofessional Conduct",
  other: "Other",
};

export const DISPUTE_STATUS = {
  PENDING: "pending",
  UNDER_REVIEW: "under_review",
  RESOLVED: "resolved",
  REJECTED: "rejected",
} as const;

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  pending: "Pending",
  under_review: "Under Review",
  resolved: "Resolved",
  rejected: "Rejected",
};
