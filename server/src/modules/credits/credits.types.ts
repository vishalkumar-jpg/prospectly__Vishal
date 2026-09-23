/**
 * Credits Module Types
 */

export interface CreditRule {
  id: string;
  provider: string;
  contactImport: number;
  credits: number;
  isActive: boolean;
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

export interface CreditBalance {
  balance: number;
  lastUpdated: string;
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
  evidence?: Record<string, unknown>;
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

export interface CreditApplicationResult {
  creditsToApply: number;
  creditsToApplyCents: number;
  effectiveCommissionCents: number;
  connectorBonusCents: number;
  newBalance: number;
  hadCredits: boolean;
}
