/**
 * Credits Module Constants
 */

export const CREDIT_PROVIDERS = {
  GOOGLE: "google",
  APPLE: "apple",
  MICROSOFT: "microsoft",
  LINKEDIN: "linkedin",
} as const;

export type CreditProvider =
  (typeof CREDIT_PROVIDERS)[keyof typeof CREDIT_PROVIDERS];

export const CREDIT_TRANSACTION_TYPES = {
  EARNED: "earned",
  USED: "used",
} as const;

export type CreditTransactionType =
  (typeof CREDIT_TRANSACTION_TYPES)[keyof typeof CREDIT_TRANSACTION_TYPES];

export const CREDIT_MESSAGES = {
  SUCCESS: {
    CREDITS_AWARDED: "Credits awarded successfully",
    CREDITS_APPLIED: "Credits applied to payout",
    BALANCE_RETRIEVED: "Credit balance retrieved",
    HISTORY_RETRIEVED: "Credit history retrieved",
    RULES_RETRIEVED: "Credit rules retrieved",
  },
  ERROR: {
    ALREADY_AWARDED: "Credits already awarded for this provider",
    THRESHOLD_NOT_MET: "Contact import threshold not met",
    INSUFFICIENT_BALANCE: "Insufficient credit balance",
    RULE_NOT_FOUND: "Credit rule not found",
    USER_NOT_FOUND: "User not found",
  },
} as const;

/**
 * Map source_type from contact_import_snapshots to credit provider
 * Includes various naming conventions used across the codebase
 */
export const SOURCE_TYPE_TO_PROVIDER: Record<string, CreditProvider> = {
  // Standard names
  Google: CREDIT_PROVIDERS.GOOGLE,
  google: CREDIT_PROVIDERS.GOOGLE,
  Apple: CREDIT_PROVIDERS.APPLE,
  apple: CREDIT_PROVIDERS.APPLE,
  Microsoft: CREDIT_PROVIDERS.MICROSOFT,
  microsoft: CREDIT_PROVIDERS.MICROSOFT,
  LinkedIn: CREDIT_PROVIDERS.LINKEDIN,
  linkedin: CREDIT_PROVIDERS.LINKEDIN,
  // Import suffix variants (used by queue processors)
  google_import: CREDIT_PROVIDERS.GOOGLE,
  apple_import: CREDIT_PROVIDERS.APPLE,
  microsoft_import: CREDIT_PROVIDERS.MICROSOFT,
  linkedin_import: CREDIT_PROVIDERS.LINKEDIN,
};

/**
 * Reverse mapping: provider to all possible source_type values
 * Used for counting enriched contacts by provider
 */
export const PROVIDER_TO_SOURCE_TYPES: Record<CreditProvider, string[]> = {
  [CREDIT_PROVIDERS.GOOGLE]: ["Google", "google", "google_import"],
  [CREDIT_PROVIDERS.APPLE]: ["Apple", "apple", "apple_import"],
  [CREDIT_PROVIDERS.MICROSOFT]: ["Microsoft", "microsoft", "microsoft_import"],
  [CREDIT_PROVIDERS.LINKEDIN]: ["LinkedIn", "linkedin", "linkedin_import"],
};

/**
 * Snapshot `source_type` values to match for a credit rule `provider` (normalized key).
 * First snapshot per `contact_relationship` must be in this set for the contact to count
 * toward that provider's import credit threshold.
 * Returns null when the rule provider has no import snapshot mapping (use legacy `contact_imports.imported` sum).
 */
export function getSourceTypeVariantsForCreditRuleProvider(
  normalizedProviderKey: string
): string[] | null {
  const k = normalizedProviderKey.trim().toLowerCase();
  if (k === "linkedin_verified") {
    return PROVIDER_TO_SOURCE_TYPES[CREDIT_PROVIDERS.LINKEDIN];
  }
  const match = (Object.values(CREDIT_PROVIDERS) as CreditProvider[]).find(
    (p) => p === k
  );
  if (match) {
    return PROVIDER_TO_SOURCE_TYPES[match];
  }
  return null;
}
