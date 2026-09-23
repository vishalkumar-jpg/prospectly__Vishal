import type { PublicRequestData } from "../src/lib/api/marketplace";
import { getSsrApiBaseUrl } from "./resolve-api-url";
import { createSsrFetchSignal } from "./ssr-utils";

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function isValidOrganization(org: unknown): boolean {
  if (org === null) return true;
  if (!org || typeof org !== "object" || Array.isArray(org)) return false;
  const o = org as Record<string, unknown>;
  return (
    isNullableString(o.name) &&
    isNullableString(o.website) &&
    isNullableString(o.logoUrl) &&
    isNullableString(o.industry) &&
    isNullableString(o.description) &&
    isNullableString(o.linkedinUrl)
  );
}

function isValidProspect(prospect: unknown): boolean {
  if (prospect === null) return true;
  if (!prospect || typeof prospect !== "object" || Array.isArray(prospect)) {
    return false;
  }
  const p = prospect as Record<string, unknown>;
  return (
    isNullableString(p.name) &&
    isNullableString(p.title) &&
    isNullableString(p.headline) &&
    isNullableString(p.photoUrl) &&
    isNullableString(p.linkedinUrl) &&
    isNullableString(p.location) &&
    ("organization" in p ? isValidOrganization(p.organization) : false)
  );
}

export function isValidPublicRequestData(
  data: unknown
): data is PublicRequestData {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }

  const d = data as Record<string, unknown>;

  return (
    typeof d.id === "string" &&
    d.id.trim().length > 0 &&
    typeof d.bountyAmount === "number" &&
    typeof d.claimerShare === "number" &&
    typeof d.sharerShare === "number" &&
    typeof d.isUrgent === "boolean" &&
    typeof d.isClaimed === "boolean" &&
    typeof d.interestedCount === "number" &&
    typeof d.viewCount === "number" &&
    typeof d.contactName === "string" &&
    typeof d.contactTitle === "string" &&
    typeof d.contactCompany === "string" &&
    typeof d.meetingTitle === "string" &&
    typeof d.meetingDescription === "string" &&
    isNullableString(d.createdAt) &&
    ("prospect" in d ? isValidProspect(d.prospect) : false)
  );
}

export async function fetchPublicRequestForSsr(
  requestId: string,
  sharerCode: string
): Promise<PublicRequestData | null> {
  const url = `${getSsrApiBaseUrl()}/marketplace/request/${encodeURIComponent(requestId)}/${encodeURIComponent(sharerCode)}`;

  const { signal, cleanup } = createSsrFetchSignal();

  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: unknown };
    const data = payload?.data;
    if (!isValidPublicRequestData(data)) return null;
    return data;
  } catch {
    return null;
  } finally {
    cleanup();
  }
}
