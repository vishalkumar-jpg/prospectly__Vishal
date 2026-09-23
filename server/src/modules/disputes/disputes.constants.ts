import { IntroductionStatus } from "modules/introductions/introductions.constants";

export enum DisputeTypeEnum {
  SERVICE_QUALITY = "service_quality",
  MEETING_NO_SHOW = "meeting_no_show",
  MEETING_CANCELLED = "meeting_cancelled",
  UNPROFESSIONAL_CONDUCT = "unprofessional_conduct",
  OTHER = "other",
}

export enum DisputeCategoryEnum {
  PAYMENT = "payment",
  SERVICE = "service",
  CONDUCT = "conduct",
  TECHNICAL = "technical",
}

export enum DisputePriorityEnum {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum DisputeStatusEnum {
  PENDING = "pending",
  UNDER_REVIEW = "under_review",
  RESOLVED = "resolved",
  REJECTED = "rejected",
}

export enum DisputeSortFieldEnum {
  CREATED_AT = "createdAt",
  UPDATED_AT = "updatedAt",
  STATUS = "status",
  PRIORITY = "priority",
  DISPUTE_TYPE = "disputeType",
}

export enum SortOrderEnum {
  ASC = "ASC",
  DESC = "DESC",
}

export const ELIGIBLE_DISPUTE_INTRODUCTION_STATUSES = [
  IntroductionStatus.ACCEPTED,
  IntroductionStatus.INTRO_SENT,
  IntroductionStatus.MEETING_SCHEDULED,
  IntroductionStatus.MEETING_BOOKED,
  IntroductionStatus.MEETING_COMPLETED,
];

export const ACTIVE_DISPUTE_STATUSES = [
  DisputeStatusEnum.PENDING,
  DisputeStatusEnum.UNDER_REVIEW,
];

export const DISPUTES_MESSAGES = {
  INFO: {
    CREATED: "Dispute created successfully",
    DELETED: "Dispute deleted successfully",
  },
  ERROR: {
    NOT_FOUND: "Dispute not found",
    INTRODUCTION_REQUEST_NOT_FOUND: "Introduction request not found",
    UNAUTHORIZED: "You are not authorized to access this dispute",
    DUPLICATE_DISPUTE:
      "An active dispute already exists for this introduction request",
    INVALID_STATUS_TRANSITION: "Invalid status transition",
    CANNOT_DELETE: "Dispute cannot be deleted in current status",
    INVALID_DATA: "Invalid data provided",
    USER_NOT_INVOLVED: "You are not involved in this introduction request",
    DISPUTED_AMOUNT_MISMATCH:
      "Disputed amount does not match the bounty amount",
    REQUESTED_REFUND_AMOUNT_TOO_HIGH:
      "Requested refund amount cannot be higher than the disputed amount",
  },
  VALIDATION: {
    INTRODUCTION_REQUEST_ID_REQUIRED: "Introduction request ID is required",
    DISPUTE_TYPE_REQUIRED: "Dispute type is required",
    DISPUTE_TYPE_INVALID: "Invalid dispute type",
    DISPUTE_CATEGORY_INVALID: "Invalid dispute category",
    PRIORITY_INVALID: "Invalid priority",
    REASON_REQUIRED: "Reason is required",
    REASON_LENGTH: "Reason must be between 10 and 5000 characters",
    EXPECTED_OUTCOME_LENGTH: "Expected outcome must not exceed 1000 characters",
    EVIDENCE_URL_INVALID: "Each evidence URL must be a valid URL",
    DISPUTED_AMOUNT_NUMBER: "Disputed amount must be a number",
    DISPUTED_AMOUNT_MIN: "Disputed amount must be greater than or equal to 0",
    DISPUTED_AMOUNT_MAX: "Disputed amount cannot exceed 999,999.99",
    REQUESTED_REFUND_AMOUNT_NUMBER: "Requested refund amount must be a number",
    REQUESTED_REFUND_AMOUNT_MIN:
      "Requested refund amount must be greater than or equal to 0",
    REQUESTED_REFUND_AMOUNT_MAX:
      "Requested refund amount cannot exceed 999,999.99",
    STATUS_INVALID: "Invalid status",
    IDS_ARRAY_REQUIRED: "IDs array is required",
    IDS_ARRAY_MIN: "At least one ID is required",
  },
};
