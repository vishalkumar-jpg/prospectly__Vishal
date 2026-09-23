import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import { renderTemplateWithVariables } from "modules/emails/templating";
import { utcDayjs } from "utils/dayjs";

export async function renderLifecycleEmail(
  emailsService: EmailsService,
  slug: Slug,
  variables: Record<string, string>
): Promise<{ subject: string; html: string }> {
  const template = await emailsService.findTemplateBySlug(slug);
  const rendered = renderTemplateWithVariables(template, variables);
  const subject = rendered.subject.replace(/[\r\n]/g, " ").trim();
  return { subject, html: rendered.html };
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

export function formatLifecycleDate(
  date: Date | string | null | undefined
): string {
  if (!date) return "";
  return utcDayjs(date).format("D MMMM YYYY");
}

export function formatProspectName(
  contactName: string | null | undefined
): string {
  const trimmed = contactName?.trim();
  return trimmed || "your prospect";
}

export function formatProspectFirstName(
  contactName: string | null | undefined
): string {
  const trimmed = contactName?.trim();
  if (!trimmed) return "Someone";
  const firstName = trimmed.split(/\s+/)[0];
  return firstName || "Someone";
}

export function formatBountyAmount(amount: string | number | null): string {
  if (amount === null || amount === undefined || amount === "") return "";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}
