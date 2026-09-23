/** @deprecated use QS_STORAGE_KEY from quick-start-storage */
export const STORAGE_KEY = "prospectly_quick_start";

export type ProspectingNavIconKey =
  | "search"
  | "activity"
  | "trophy"
  | "wallet"
  | "users";

export const PROSPECTING_NAV: [string, ProspectingNavIconKey, string][] = [
  ["find-prospects", "search", "Find Prospects"],
  ["my-prospects", "activity", "My Prospects"],
  ["incoming-requests", "users", "Incoming Requests"],
  ["opportunities", "trophy", "Opportunities"],
  ["transactions", "wallet", "Transactions"],
];
