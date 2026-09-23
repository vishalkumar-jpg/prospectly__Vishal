/**
 * Returns the URL only when it is an absolute http(s) link, otherwise null.
 * Guards against unsafe schemes (e.g. javascript:) from untrusted data before
 * the value is placed into an anchor href.
 */
export const toSafeHttpUrl = (
  value: string | null | undefined
): string | null => {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
};

/**
 * Encrypts an email by masking the local part.
 * If the email is already masked or malformed, it returns the original email.
 */
export const encryptEmail = (email: string | null | undefined) => {
  if (!email) return "";

  // Basic check for already masked email or obviously invalid structure
  if (email.includes("***") || !email.includes("@")) {
    return email;
  }

  const parts = email.split("@");
  if (parts.length !== 2) {
    return email;
  }

  const [localPart, domain] = parts;

  // Pattern check: if localPart matches what we usually produce (e.g., a***b)
  // or if it already has asterisks.
  if (localPart.includes("*")) {
    return email;
  }

  if (localPart.length === 0) {
    return email;
  }

  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }

  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
};

export const getCommissionAmount = (bountyAmount: number) => {
  // Platform fee should be 20%
  return (bountyAmount * 20) / 100;
};

export const getFinalTotal = (bountyAmount: number) => {
  const platformFee = getCommissionAmount(bountyAmount);
  return bountyAmount - platformFee;
};

export function formatEscrowAuthorizationAmount(
  totalAmount: number | null | undefined,
  options?: { recalculating?: boolean }
): string {
  if (totalAmount == null) {
    return options?.recalculating ? "Estimating…" : "—";
  }
  const n = Number(totalAmount);
  if (!Number.isFinite(n)) {
    return "—";
  }
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export const getProgressColor = (progress: number): string => {
  if (progress === 0) return "bg-gray-400";
  if (progress === 25) return "bg-yellow-500";
  if (progress === 50) return "bg-blue-500";
  if (progress === 75) return "bg-orange-500";
  if (progress === 100) return "bg-green-500";
  return "bg-primary";
};

/**
 * True when the introduction was withdrawn by the requester (DB status `archived`).
 * Do not use `requesterArchived` alone: the requester archive list marks every row
 * with that flag, including completed introductions.
 */
export function isIntroductionRequesterWithdrawn(row: {
  stage?: string;
  status?: string;
}): boolean {
  return row.status === "archived" || row.stage === "archived";
}

export type PotentialConnectorsSummary = {
  totalCount: number;
  pendingCount: number;
  declinedCount: number;
  hasAccepted: boolean;
};

/** Show connector pool UI instead of a single connector profile. */
export function shouldShowConnectorPool(params: {
  withdrawn?: boolean;
  connectorId?: string | null;
  connectorName?: string | null;
  potentialConnectors?: PotentialConnectorsSummary | null;
}): boolean {
  const { withdrawn, connectorId, connectorName, potentialConnectors } = params;
  if (connectorId) return false;
  if (connectorName === "User's Account deleted") return false;
  if (withdrawn) return true;
  if (potentialConnectors && !potentialConnectors.hasAccepted) return true;
  return !connectorName;
}

export { labelRequesterArchiveReason } from "@/constants/requester-archive-reasons";
