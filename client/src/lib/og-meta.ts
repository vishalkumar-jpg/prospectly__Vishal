/** Plain-text excerpt for public page meta descriptions (mirrors server og-meta.utils). */
export const OG_RECRUITING_IMAGE = "/og/recruiting-share.webp";
export const OG_PROSPECTING_IMAGE = "/og/prospecting-share.webp";

export function stripHtmlForMeta(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateMetaText(value: string, maxLength = 160): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildPublicJobSeoMeta(job: {
  title: string;
  companyName: string;
  description?: string | null;
  requirements?: string | null;
}) {
  const title = `${job.title} @ ${job.companyName} | Prospectly`;
  const fallback = `Apply for ${job.title} at ${job.companyName} on Prospectly.`;
  const raw = job.description || job.requirements || fallback;
  const description = truncateMetaText(stripHtmlForMeta(raw));
  return { title, description };
}

export function buildPublicRequestSeoMeta(request: {
  meetingTitle?: string | null;
  meetingDescription?: string | null;
  contactName?: string | null;
  prospectName?: string | null;
}) {
  const title = `${request.meetingTitle || "Introduction Opportunity"} | Prospectly`;
  const prospectLabel = request.prospectName || request.contactName;
  const fallback = prospectLabel
    ? `Introduction opportunity with ${prospectLabel} on Prospectly.`
    : "Introduction opportunity on Prospectly.";
  const raw = request.meetingDescription || fallback;
  const description = truncateMetaText(stripHtmlForMeta(raw));
  return { title, description };
}
