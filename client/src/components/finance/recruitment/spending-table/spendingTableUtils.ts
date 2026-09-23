import type {
  SpendingCandidateGroup,
  SpendingJobGroup,
  SpendingTransaction,
} from "@/lib/api/recruitment-spending";
import { utcDayjs } from "@/lib/dayjs";

/**
 * Shared tokens and formatters for the grouped requester-spending table
 * (job → candidate → charge), styled after the "Hairline & rail" wireframe.
 */

/** Hide Status / Date / Action below 980px — must match RequesterSpendingTable headers. */
export const SPENDING_DETAIL_COLUMN_CLASS = "max-[980px]:hidden";

/** Tailwind width classes for the header colgroup so every level stays aligned. */
export const SPENDING_COLUMN_WIDTHS = [
  "w-[27%]",
  "w-[27%]",
  "w-[13%]",
  "w-[12%]",
  "w-[15%]",
  "w-[6%]",
] as const;

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  interview_cost: "Placement Fee",
  flat_deposit: "Referral Deposit",
  flat_topup: "Referral Top-up",
  success_fee: "Success Fee",
  success_fee_topup: "Success Fee Top-up",
};

/** Charge-kind tint: deposits read sky, fees stay neutral, top-ups amethyst. */
export const TRANSACTION_TYPE_TAG_CLASSES: Record<string, string> = {
  flat_deposit: "border-transparent bg-brand-sky/10 text-brand-sky",
  interview_cost: "border-border bg-muted/60 text-muted-foreground",
  success_fee: "border-border bg-muted/60 text-muted-foreground",
  flat_topup: "border-transparent bg-brand-amethyst/10 text-brand-amethyst",
  success_fee_topup:
    "border-transparent bg-brand-amethyst/10 text-brand-amethyst",
};

export const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "border-brand-warning/30 bg-brand-warning/15 text-brand-warning",
  },
  authorized: {
    label: "Authorized",
    className: "border-blue-500/30 bg-blue-500/15 text-blue-700",
  },
  captured: {
    label: "Paid",
    className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-slate-500/30 bg-slate-500/15 text-slate-700",
  },
};

/** Shown instead of an email while the candidate's identity is still hidden. */
export const HIDDEN_IDENTITY_LABEL = "Identity hidden until accepted";

const AVATAR_GRADIENTS = [
  "bg-gradient-to-br from-brand-amethyst to-brand-rose",
  "bg-gradient-to-br from-brand-sky to-brand-amethyst",
  "bg-gradient-to-br from-brand-success to-brand-sky",
  "bg-gradient-to-br from-brand-rose to-brand-amethyst",
];

const formatCurrency = (amount: string | number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));

/** Every row in this table is money leaving the requester, so always negative. */
export const formatOutflow = (amount: string | number): string =>
  `-${formatCurrency(amount)}`;

export const getTransactionTypeLabel = (transactionType: string): string =>
  TRANSACTION_TYPE_LABELS[transactionType] ??
  transactionType.replace(/_/g, " ");

export const pluralize = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

export function getCandidateInitials(label: string, revealed: boolean): string {
  if (!revealed) return "#";
  const initials = label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return initials || "#";
}

/** Stable per-candidate gradient so the avatar colour never shuffles on refetch. */
export function getAvatarGradient(seed: string): string {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100003;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

const compareTransactionsByDate = (
  a: SpendingTransaction,
  b: SpendingTransaction
): number =>
  utcDayjs(b.createdAt).valueOf() - utcDayjs(a.createdAt).valueOf();

export const getLatestTransaction = (candidate: SpendingCandidateGroup) => {
  if (!candidate.transactions.length) return null;
  return candidate.transactions.reduce((latest, transaction) =>
    compareTransactionsByDate(transaction, latest) < 0 ? transaction : latest
  );
};

export const getJobLatestTransaction = (job: SpendingJobGroup) => {
  let latest: SpendingTransaction | null = null;
  for (const candidate of job.candidates) {
    const transaction = getLatestTransaction(candidate);
    if (!transaction) continue;
    if (!latest || compareTransactionsByDate(transaction, latest) < 0) {
      latest = transaction;
    }
  }
  return latest;
};

export const getCandidatePendingCount = (
  candidate: SpendingCandidateGroup
): number =>
  candidate.transactions.filter(
    (transaction) =>
      transaction.status === "pending" || transaction.status === "authorized"
  ).length;
