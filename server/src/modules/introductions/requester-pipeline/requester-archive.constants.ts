export const REQUESTER_ARCHIVE_REASONS = {
  NOT_INTERESTED_CONNECTING_WITH_PROSPECT:
    "not_interested_connecting_with_prospect",
  CONNECTOR_OR_SCHEDULING_TIMEOUT: "connector_or_scheduling_timeout",
  ALREADY_IN_NETWORK: "already_in_network",
  OTHER: "other",
} as const;

export type RequesterArchiveReason =
  (typeof REQUESTER_ARCHIVE_REASONS)[keyof typeof REQUESTER_ARCHIVE_REASONS];

export const REQUESTER_ARCHIVE_REASON_VALUES = Object.values(
  REQUESTER_ARCHIVE_REASONS
) as string[];

/** Claim rows in these states block requester archive (marketplace verify in progress). */
export const MARKETPLACE_CLAIM_BLOCKING_STATUSES = [
  "pending",
  "verifying",
  "in_progress",
] as const;

export const REQUESTER_ARCHIVE_MESSAGES = {
  CONFLICT_CLAIM_IN_PROGRESS:
    "Someone is verifying a connection for this listing. Try again when verification finishes.",
  INVALID_STAGE:
    "You can only archive this request before a meeting is booked.",
  NOT_REQUESTER: "Only the requester can archive this introduction.",
  ALREADY_ARCHIVED: "This introduction is already archived.",
} as const;

export const ARCHIVE_SUCCESS_MESSAGE = "Your request has been withdrawn.";
