import { RECRUITMENT_INTERVIEW_TXN_TYPE } from "modules/recruitment/payout/recruitment-payout.constants";

// Every recruitment_interview_transactions.transaction_type the recruiter
// (requester) actually spends money on: the interview/referral charge, the
// one-time flat referral deposit, the post-hire flat fee top-up, the candidate
// success fee, and its top-up. Shared by the list, stats, and detail services so
// the three views stay in sync.
export const REQUESTER_SPENDING_TXN_TYPES = [
  RECRUITMENT_INTERVIEW_TXN_TYPE.INTERVIEW_COST,
  RECRUITMENT_INTERVIEW_TXN_TYPE.FLAT_DEPOSIT,
  RECRUITMENT_INTERVIEW_TXN_TYPE.FLAT_TOPUP,
  RECRUITMENT_INTERVIEW_TXN_TYPE.SUCCESS_FEE,
  RECRUITMENT_INTERVIEW_TXN_TYPE.SUCCESS_FEE_TOPUP,
] as const;

export enum RequesterSpendingStatusEnum {
  ALL = "all",
  PENDING = "pending",
  AUTHORIZED = "authorized",
  CAPTURED = "captured",
  CANCELLED = "cancelled",
}

export enum RequesterSpendingSortFieldEnum {
  DATE = "date",
  AMOUNT = "amount",
  STATUS = "status",
}

export enum RequesterSpendingSortOrderEnum {
  ASC = "asc",
  DESC = "desc",
}

export const REQUESTER_SPENDING_MESSAGES = {
  INFO: {
    FETCHING_LIST: (userId: string) =>
      `Fetching requester spending list for user ${userId}`,
    FETCHING_STATS: (userId: string) =>
      `Fetching requester spending stats for user ${userId}`,
    FETCHING_DETAIL: (id: string, userId: string) =>
      `Fetching spending detail ${id} for user ${userId}`,
  },
  ERROR: {
    TRANSACTION_NOT_FOUND: "Transaction not found",
    NO_ACCESS: "You do not have access to this transaction",
  },
};
