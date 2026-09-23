type UserConfigurationLike = {
  hasSkipBankAccount?: boolean;
  has_skip_bank_account?: boolean;
};

export function hasSkippedBankAccount(
  config?: UserConfigurationLike | null
): boolean {
  if (!config) return false;
  return Boolean(config.hasSkipBankAccount ?? config.has_skip_bank_account);
}
