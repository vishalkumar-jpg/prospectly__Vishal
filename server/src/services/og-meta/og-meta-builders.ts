import type { TransformedPublicRequestDetails } from "modules/global-marketplace/utils/marketplace-public-request";
import type { OgPageMeta } from "./og-meta.types";
import { stripHtml, truncateText } from "./og-meta.utils";

type PublicJobOgSource = {
  title: string;
  companyName: string;
  description?: string | null;
  requirements?: string | null;
};

export function buildJobOgMeta(
  job: PublicJobOgSource,
  pageUrl: string,
  imageUrl: string
): OgPageMeta {
  const title = `${job.title} @ ${job.companyName} | Prospectly`;
  const fallback = `Apply for ${job.title} at ${job.companyName} on Prospectly.`;
  const raw = job.description || job.requirements || fallback;
  const description = truncateText(stripHtml(raw));

  return {
    title,
    description,
    image: imageUrl,
    url: pageUrl,
    type: "website",
  };
}

export function buildRequestOgMeta(
  request: TransformedPublicRequestDetails,
  pageUrl: string,
  imageUrl: string
): OgPageMeta {
  const title = `${request.meetingTitle || "Introduction Opportunity"} | Prospectly`;
  const prospectLabel = request.prospect?.name || request.contactName;
  const fallback = prospectLabel
    ? `Introduction opportunity with ${prospectLabel} on Prospectly.`
    : "Introduction opportunity on Prospectly.";
  const raw = request.meetingDescription || fallback;
  const description = truncateText(stripHtml(raw));

  return {
    title,
    description,
    image: imageUrl,
    url: pageUrl,
    type: "website",
  };
}
