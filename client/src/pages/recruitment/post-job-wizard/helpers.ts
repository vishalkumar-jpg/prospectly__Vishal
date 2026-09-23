import { formatMoneyWithCommas } from "@/lib/formatted-decimal";

export const formatCurrency = (amount: number): string => {
  return `$${formatMoneyWithCommas(amount)}`;
};

export const SALARY_PERIOD_LABELS: Record<string, string> = {
  yearly: "Yearly",
  monthly: "Monthly",
  weekly: "Weekly",
  hourly: "Hourly",
};
