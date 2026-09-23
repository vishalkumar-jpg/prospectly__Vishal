import { utcDayjs } from "utils/dayjs";

const EMAIL_LOCALE = "en-US";
export const PAYOUT_CREDIT_BUSINESS_DAYS = 7;

export function formatRecruitmentUsd(
  amount: string | number | null | undefined
): string {
  if (amount === null || amount === undefined || amount === "") return "";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num) || num === 0) return "";
  return new Intl.NumberFormat(EMAIL_LOCALE, {
    style: "currency",
    currency: "USD",
  }).format(num);
}

export function formatLifecycleDate(
  date: Date | string | null | undefined
): string {
  if (!date) return "";
  return utcDayjs(date).format("D MMMM YYYY");
}

/** Adds business days (Mon–Fri) from the given start date. */
export function addBusinessDays(
  start: Date | string,
  businessDays: number
): Date {
  let current = utcDayjs(start).startOf("day");
  let added = 0;
  while (added < businessDays) {
    current = current.add(1, "day");
    const day = current.day();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }
  return current.toDate();
}

export function formatEstimatedPayoutCreditDate(
  releasedAt: Date | string
): string {
  return formatLifecycleDate(
    addBusinessDays(releasedAt, PAYOUT_CREDIT_BUSINESS_DAYS)
  );
}

export function formatMatchScore(
  score: string | number | null | undefined
): string {
  if (score === null || score === undefined || score === "") return "";
  const num = typeof score === "string" ? parseFloat(score) : score;
  if (Number.isNaN(num)) return "";
  return String(Math.round(num));
}

export function formatUserDisplayName(user: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  if (user.fullName?.trim()) return user.fullName.trim();
  const parts = [user.firstName, user.lastName].filter(Boolean).join(" ");
  if (parts) return parts;
  return user.email?.trim() || "there";
}

export function formatUserFirstName(user: {
  fullName?: string | null;
  firstName?: string | null;
}): string {
  if (user.firstName?.trim()) return user.firstName.trim();
  if (user.fullName?.trim()) {
    const firstName = user.fullName.trim().split(/\s+/)[0];
    if (firstName) return firstName;
  }
  return "there";
}
