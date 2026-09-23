import type {
  ConnectorEarningCandidateGroup,
  ConnectorEarningJobGroup,
  ConnectorEarningPayoutItem,
} from "@/lib/api/connector-earning";
import { utcDayjs } from "@/lib/dayjs";
import {
  SPENDING_COLUMN_WIDTHS,
  SPENDING_DETAIL_COLUMN_CLASS,
  pluralize,
} from "../spending-table/spendingTableUtils";

export {
  SPENDING_COLUMN_WIDTHS as EARNING_COLUMN_WIDTHS,
  SPENDING_DETAIL_COLUMN_CLASS as EARNING_DETAIL_COLUMN_CLASS,
  pluralize,
};

const formatCurrency = (amount: string | number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));

export const formatInflow = (amount: string | number): string =>
  formatCurrency(amount);

export const EARNING_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "border-amber-500/30 bg-amber-500/15 text-amber-700",
  },
  onboarding_pending: {
    label: "Awaiting Setup",
    className: "border-amber-500/30 bg-amber-500/15 text-amber-700",
  },
  queued: {
    label: "Processing",
    className: "border-blue-500/30 bg-blue-500/15 text-blue-700",
  },
  processing: {
    label: "Processing",
    className: "border-blue-500/30 bg-blue-500/15 text-blue-700",
  },
  completed: {
    label: "Paid",
    className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700",
  },
  failed: {
    label: "Failed",
    className: "border-red-500/30 bg-red-500/15 text-red-700",
  },
  manual_review: {
    label: "Under Review",
    className: "border-amber-500/30 bg-amber-500/15 text-amber-700",
  },
};

const comparePayoutsByDate = (
  a: ConnectorEarningPayoutItem,
  b: ConnectorEarningPayoutItem
): number => utcDayjs(b.createdAt).valueOf() - utcDayjs(a.createdAt).valueOf();

export const getLatestPayout = (candidate: ConnectorEarningCandidateGroup) => {
  if (!candidate.earnings.length) return null;
  return candidate.earnings.reduce((latest, payout) =>
    comparePayoutsByDate(payout, latest) < 0 ? payout : latest
  );
};

export const getJobLatestPayout = (job: ConnectorEarningJobGroup) => {
  let latest: ConnectorEarningPayoutItem | null = null;
  for (const candidate of job.candidates) {
    const payout = getLatestPayout(candidate);
    if (!payout) continue;
    if (!latest || comparePayoutsByDate(payout, latest) < 0) {
      latest = payout;
    }
  }
  return latest;
};

export const getCandidatePendingCount = (
  candidate: ConnectorEarningCandidateGroup
): number =>
  candidate.earnings.filter((payout) =>
    ["pending", "onboarding_pending", "queued", "processing"].includes(
      payout.processingStatus
    )
  ).length;
