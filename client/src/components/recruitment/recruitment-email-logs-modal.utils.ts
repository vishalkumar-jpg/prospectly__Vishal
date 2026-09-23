import {
  RECRUITMENT_EMAIL_RECIPIENT_TYPE_LABELS,
  RECRUITMENT_EMAIL_TYPE_LABELS,
  type RecruitmentEmailLogsAudience,
} from "@/lib/api/recruitment-email-logs";

const EMAIL_LOG_STATUS_BADGE: Record<string, string> = {
  sent: "border-emerald-200 bg-emerald-50 text-emerald-700",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  bounced: "border-amber-200 bg-amber-50 text-amber-700",
  complained: "border-red-200 bg-red-50 text-red-700",
};

export function formatEmailType(emailType: string) {
  return (
    RECRUITMENT_EMAIL_TYPE_LABELS[emailType] ??
    emailType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function formatRecipientType(recipientType: string) {
  return (
    RECRUITMENT_EMAIL_RECIPIENT_TYPE_LABELS[recipientType] ??
    recipientType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getEmailLogStatusBadgeClass(status: string) {
  return (
    EMAIL_LOG_STATUS_BADGE[status.toLowerCase()] ??
    "border-slate-200 bg-slate-50 text-slate-600"
  );
}

export function audienceDescription(_audience: RecruitmentEmailLogsAudience) {
  return "Emails you sent for this referral.";
}
