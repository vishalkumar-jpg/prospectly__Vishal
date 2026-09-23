/** @deprecated use QS_STORAGE_KEY from quick-start-storage */
export const STORAGE_KEY = "prospectly_quick_start";

/** Fictitious user shown in the walkthrough top bar (replaces role label). */
export const RECRUITING_DEMO_USER = {
  name: "Marcus Reed",
} as const;

export function recruitingTopUserBadge(): string {
  const { name } = RECRUITING_DEMO_USER;
  return (
    '<div class="m-user"><div class="av">' +
    name.charAt(0) +
    "</div>" +
    name +
    "</div>"
  );
}

export type NavIconKey =
  | "clipboardList"
  | "filePlus"
  | "activity"
  | "store"
  | "wallet";

export const EMPLOYER_NAV: [string, NavIconKey, string][] = [
  ["post-job", "clipboardList", "Post a Job"],
  ["my-jobs", "filePlus", "My Job Posts"],
  ["refer", "activity", "Refer Candidates"],
  ["marketplace", "store", "Job Marketplace"],
  ["transactions", "wallet", "Transactions"],
];

export const SEEKER_NAV: [string, NavIconKey, string][] = [
  ["applications", "filePlus", "My Applications"],
];

/** @deprecated use EMPLOYER_NAV + SEEKER_NAV */
export const NAV: [string, NavIconKey, string][] = [
  ...EMPLOYER_NAV,
  ...SEEKER_NAV,
];

export const WIZARD_STEPS = [
  "Method",
  "Job Details",
  "Skills",
  "Description",
  "Assessment",
  "Budget & Pricing Model",
  "Connector Payout",
  "Success Fees",
  "Payment",
  "Notify",
  "Confirm",
];

export const RSTAGES: [string, string][] = [
  ["In Review", "#D97706"],
  ["Shortlisted", "#9F81BD"],
  ["Invite Sent", "#6366F1"],
  ["Interview Scheduled", "#10B981"],
  ["Interview Completed", "#0FA89A"],
  ["Hired", "#0B8276"],
  ["Rejected", "#94A3B8"],
];

/** Recruiter kanban stage keys (snake_case) + display labels */
export const RECRUITER_PIPELINE_STAGES: [string, string][] = [
  ["in_review", "In Review"],
  ["shortlisted", "Shortlisted"],
  ["interview_invite_sent", "Invite Sent"],
  ["interview_scheduled", "Interview Scheduled"],
  ["interview_completed", "Interview Completed"],
  ["hired", "Hired"],
  ["rejected", "Rejected"],
];

export const CSTAGES: [string, string][] = [
  ["Consent Pending", "#D97706"],
  ["Consent Accepted", "#24AADE"],
  ["Shortlisted", "#9F81BD"],
  ["Interview Invite Sent", "#6366F1"],
  ["Interview Scheduled", "#10B981"],
  ["Interview Completed", "#0FA89A"],
  ["Hired", "#0B8276"],
  ["Consent Declined", "#F43F5E"],
  ["Rejected", "#94A3B8"],
];
