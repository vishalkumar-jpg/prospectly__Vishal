/**
 * Credits API Module
 * Handles credit balance, rules, and history
 */

import { request } from "./core";

export interface CreditBalance {
  balance: number;
  lastUpdated: string;
}

export interface CreditRuleForUI {
  id: string;
  provider: string;
  threshold: number;
  credits: number;
  isEarned: boolean;
  earnedAt?: string;
  importedContactsCount?: number;
}

/** Fields stored on earned import transactions (see server userCreditHistory.evidence) */
export interface CreditHistoryImportEvidence {
  threshold?: number;
  cumulativeImported?: number;
  ruleId?: string;
  contactsImportId?: string;
  provider?: string;
}

export interface CreditHistoryItem {
  id: string;
  transactionType: "earned" | "used";
  provider?: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  enrichedContactsCount?: number;
  introductionTitle?: string;
  requesterName?: string;
  createdAt: string;
  evidence?: CreditHistoryImportEvidence | Record<string, unknown>;
}

export interface CreditHistoryResponse {
  history: CreditHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const creditsApi = {
  getMyBalance: () => request<CreditBalance>("/credits/me"),

  getRules: () => request<CreditRuleForUI[]>("/credits/rules"),

  getMyHistory: (limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append("limit", limit.toString());
    if (offset !== undefined) params.append("offset", offset.toString());
    const query = params.toString();
    return request<CreditHistoryResponse>(
      `/credits/me/history${query ? `?${query}` : ""}`
    );
  },
};
