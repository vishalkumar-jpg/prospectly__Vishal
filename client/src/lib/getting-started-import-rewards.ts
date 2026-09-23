import { formatConnectorCreditsDollars } from "@/lib/creditRulesUi";

function contactsWord(n: number): "contact" | "contacts" {
  return n === 1 ? "contact" : "contacts";
}

/** Full requirement sentence for Trust Score (Step 1 cards / LinkedIn). */
export function formatTrustScoreRequirement(
  minContacts: number,
  points: number
): string {
  const w = contactsWord(minContacts);
  return `Import ${minContacts} ${w} → +${points.toFixed(1)} Trust Score Points`;
}

/** Earned-state copy for Trust Score. */
export function formatTrustScoreEarned(points: number): string {
  return `+${points.toFixed(1)} Trust Score Points Earned`;
}

/** Full requirement sentence for Connector Credits (arrow + dollar form). */
export function formatConnectorCreditsRequirement(
  threshold: number,
  creditsValue: number
): string {
  const w = contactsWord(threshold);
  const dollars = formatConnectorCreditsDollars(creditsValue);
  return `Import ${threshold} ${w} → +${dollars} Connector Credits`;
}

/** Earned-state copy for Connector Credits. */
export function formatConnectorCreditsEarned(creditsValue: number): string {
  return `+${formatConnectorCreditsDollars(creditsValue)} Connector Credits Earned`;
}

/**
 * When min contacts is unknown, show points only (neutral fallback).
 */
export function formatTrustScorePointsValueOnly(points: number): string {
  return `+${points.toFixed(1)} Trust Score Points`;
}

/** Short hero line (no "Earned"); same as value-only line for cards. */
export function formatTrustScoreDisplayShort(points: number): string {
  return formatTrustScorePointsValueOnly(points);
}

/** Short hero line: +$N Connector Credits from rule credits value. */
export function formatConnectorCreditsDisplayShort(
  creditsValue: number
): string {
  return `+${formatConnectorCreditsDollars(creditsValue)} Connector Credits`;
}

/** Compact tooltip for unearned Trust Score (no arrow sentence). */
export function formatTrustScoreUnlockTooltip(
  minContacts: number,
  points: number
): string {
  const w = contactsWord(minContacts);
  return `Import ${minContacts} ${w} to unlock +${points.toFixed(1)} Trust Score Points`;
}

/** Compact tooltip for unearned Connector Credits. */
export function formatConnectorCreditsUnlockTooltip(
  threshold: number,
  creditsValue: number
): string {
  const w = contactsWord(threshold);
  const dollars = formatConnectorCreditsDollars(creditsValue);
  return `Import ${threshold} ${w} to unlock ${dollars} in Connector Credits`;
}

/** Tooltip when Connector Credits are already earned (e.g. LinkedIn hero). */
export function formatConnectorCreditsEarnedTooltip(
  threshold: number,
  creditsValue: number,
  sourceLabel = "this source"
): string {
  const w = contactsWord(threshold);
  const dollars = formatConnectorCreditsDollars(creditsValue);
  return `Earned ${dollars} in Connector Credits after importing at least ${threshold} ${w} from ${sourceLabel}.`;
}

/** Pluralized account-connected copy for Getting Started source cards. */
export function connectedAccountsLine(
  accounts: { isActive: boolean }[] | undefined,
  isLoading: boolean
): string | null {
  if (isLoading || accounts == null) return null;
  const n = accounts.filter((a) => a.isActive).length;
  if (n <= 0) return null;
  return `${n.toLocaleString()} Account(s)`;
}
