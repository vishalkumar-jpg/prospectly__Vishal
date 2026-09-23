import {
  buildPublicJobSeoMeta,
  buildPublicRequestSeoMeta,
  OG_PROSPECTING_IMAGE,
  OG_RECRUITING_IMAGE,
} from "@/lib/og-meta";
import type { PublicRequestData } from "@/lib/api/marketplace";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildHeadTags(params: {
  seo: { title: string; description: string };
  canonical: string;
  imagePath: string;
}) {
  const { seo, canonical, imagePath } = params;
  const imageUrl = `${new URL(canonical).origin}${imagePath}`;

  return [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`,
  ].join("\n    ");
}

export function buildPublicJobHeadTags(params: {
  job: {
    id: string;
    title: string;
    companyName: string;
    description?: string | null;
    requirements?: string | null;
  };
  origin: string;
}) {
  const { job, origin } = params;
  const seo = buildPublicJobSeoMeta(job);
  const canonical = `${origin}/jobs/${job.id}`;

  return buildHeadTags({
    seo,
    canonical,
    imagePath: OG_RECRUITING_IMAGE,
  });
}

export function buildPublicRequestHeadTags(params: {
  request: PublicRequestData;
  requestId: string;
  sharerCode: string;
  origin: string;
}) {
  const { request, requestId, sharerCode, origin } = params;
  if (!request) {
    throw new Error("SSR public request head tags require request data");
  }
  const seo = buildPublicRequestSeoMeta({
    meetingTitle: request.meetingTitle,
    meetingDescription: request.meetingDescription,
    contactName: request.prospect?.name ?? request.contactName,
    prospectName: request.prospect?.name ?? request.contactName,
  });
  const canonical = `${origin}/request/${requestId}/${sharerCode}`;

  return buildHeadTags({
    seo,
    canonical,
    imagePath: OG_PROSPECTING_IMAGE,
  });
}
