export const DELETE_ACCOUNT_STEPS = [
  // { id: 1, title: "Pre-flight check" },
  // { id: 2, title: "Export your data" },
  { id: 1, title: "Tell us why" },
  { id: 2, title: "Confirm" },
] as const;

export const DELETE_REASON_LABELS = [
  "Too expensive for my use case",
  "I'm not using it enough",
  "I found a better alternative",
  "Privacy or data concerns",
  "The product is missing features I need",
  "I created this account by mistake",
  "Other / prefer not to say",
] as const;

export const OTHER_REASON_LABEL = "Other / prefer not to say";

export const PREFLIGHT_CLEAR_TILES = [
  {
    title: "No pending introductions",
    subtitle: "All requests resolved",
  },
  {
    title: "Subscription cancelled",
    subtitle: "No recurring charges",
  },
  {
    title: "No funds in escrow",
    subtitle: "No active marketplace holds",
  },
  {
    title: "No pending payouts",
    subtitle: "Stripe payouts cleared",
  },
] as const;

export const EXPORT_DATA_OPTIONS = [
  {
    id: "contacts",
    label: "Contacts & notes",
    description: "248 contacts · CSV + JSON",
    size: "~2 MB",
    defaultChecked: true,
  },
  {
    id: "introductions",
    label: "Introduction history",
    description: "17 completed · JSON",
    size: "~80 KB",
    defaultChecked: true,
  },
  {
    id: "payments",
    label: "Payment & payout history",
    description: "PDF receipts + CSV ledger",
    size: "~1.2 MB",
    defaultChecked: true,
  },
  {
    id: "reviews",
    label: "Marketplace reviews",
    description: "Reviews you wrote and received",
    size: "~12 KB",
    defaultChecked: false,
  },
  {
    id: "activity",
    label: "Account activity log",
    description: "Sign-ins, settings changes, audit trail",
    size: "~340 KB",
    defaultChecked: false,
  },
] as const;

export type DeleteAccountSurveyState = {
  primaryReason: string;
  feedbackText: string;
  additionalDetails: string;
};
