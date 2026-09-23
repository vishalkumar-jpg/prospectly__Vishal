import type { CreditRuleForUI } from "@/lib/api/credits";

export type ConnectorCreditInfo = {
  threshold: number | null;
  credits: number | null;
  isEarned: boolean;
  importedContactsCount?: number;
};

export function getCreditInfoForProvider(
  creditRulesData: CreditRuleForUI[] | undefined,
  provider: string
): ConnectorCreditInfo {
  if (!creditRulesData) {
    return { threshold: null, credits: null, isEarned: false };
  }

  const rule = creditRulesData.find(
    (r) => r.provider?.trim().toLowerCase() === provider?.trim().toLowerCase()
  );
  if (!rule) {
    return { threshold: null, credits: null, isEarned: false };
  }

  return {
    threshold: rule.threshold,
    credits: rule.credits,
    isEarned: rule.isEarned,
    importedContactsCount: rule.importedContactsCount,
  };
}

export function formatConnectorCreditRewardAmount(credits: number): string {
  return `+$${credits.toFixed(2)}`;
}

/** Display dollars for Connector Credits UI (whole dollars when .00). */
export function formatConnectorCreditsDollars(credits: number): string {
  if (Number.isInteger(credits) || Math.abs(credits % 1) < 0.005) {
    return `$${Math.round(credits)}`;
  }
  return `$${credits.toFixed(2)}`;
}

/** Label for import modals; matches Getting Started copy when pending. */
export function connectorCreditModalLabel(info: ConnectorCreditInfo): string {
  if (info.credits == null) {
    return "Connector Credits";
  }
  const dollars = formatConnectorCreditsDollars(info.credits);
  if (info.isEarned) {
    return `${dollars} Connector Credits Earned`;
  }
  if (info.threshold != null) {
    const c = info.threshold === 1 ? "contact" : "contacts";
    return `Import ${info.threshold} ${c} to unlock ${dollars} Connector Credits`;
  }
  return "Connector Credits available";
}
