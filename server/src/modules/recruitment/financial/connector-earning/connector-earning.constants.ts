/**
 * Constants, enums, and messages for the Connector Earning module.
 *
 * Mirrors the shape of `requester-spending.constants.ts` but is scoped to
 * `recruitment_payout_history` (payoutType = 'connector') rather than the
 * interview transactions table.
 */

export enum ConnectorEarningStatusEnum {
  ALL = "all",
  PENDING = "pending",
  ONBOARDING_PENDING = "onboarding_pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum ConnectorEarningSortFieldEnum {
  DATE = "date",
  AMOUNT = "amount",
  STATUS = "status",
}

export enum ConnectorEarningSortOrderEnum {
  ASC = "asc",
  DESC = "desc",
}

export const CONNECTOR_EARNING_MESSAGES = {
  INFO: {
    FETCHING_LIST: (userId: string) =>
      `Fetching connector earning list for user ${userId}`,
    FETCHING_STATS: (userId: string) =>
      `Fetching connector earning stats for user ${userId}`,
    FETCHING_DETAIL: (id: string, userId: string) =>
      `Fetching connector earning detail ${id} for user ${userId}`,
  },
  WARN: {
    // Emitted when is_marketplace_deal and the candidate_connectors role disagree.
    // Useful for spotting data drift between the denormalized flag and the
    // authoritative split-ownership table.
    SPLIT_DRIFT: (id: string) =>
      `CONNECTOR_EARNING :: split drift detected on payout ${id} — is_marketplace_deal disagrees with candidate_connectors.role`,
  },
  ERROR: {
    PAYOUT_NOT_FOUND: "Earning not found",
  },
};
