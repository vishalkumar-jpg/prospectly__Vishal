// Single source of truth for recruitment commission percentages. Whole-number
// format. All marketplace, payout, payout-queue, share-public-job, and
// candidate-connectors code reads these via RecruitmentFeeConfigService —
// never import the constants directly outside the fee-config module so the
// service can later swap to DB-backed admin config without touching call
// sites.
//
// SPLIT_CONNECTOR_SHARE_PERCENT is the per-recipient share inside the
// connector pool when a candidate has two connectors (claimer + sharer).
// 50 means each receives half of the connector pool (i.e. half of 80% = 40%
// of gross). The two split shares must always sum to 100.
export const RECRUITMENT_FEE_CONFIG_DEFAULTS = {
  CONNECTOR_PERCENT: 80,
  PLATFORM_PERCENT: 20,
  CANDIDATE_SUCCESS_FEE_RECIPIENT_PERCENT: 100,
  CANDIDATE_SUCCESS_FEE_PLATFORM_PERCENT: 0,
  SPLIT_CONNECTOR_SHARE_PERCENT: 50,
} as const;
