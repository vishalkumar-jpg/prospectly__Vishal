import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull } from "drizzle-orm";
import * as schema from "database/schema";

export interface PublicRequestDetails {
  id: string;
  contactName: string | null;
  meetingTitle: string | null;
  meetingDescription: string | null;
  bountyAmount: string;
  isUrgent: boolean;
  createdAt: Date | string | null;
  // Contact columns (nullable — contact may be missing/soft-deleted)
  contactTitle: string | null;
  contactCompany: string | null;
  contactLinkedin: string | null;
  contactWebsite: string | null;
  contactPhotoUrl: string | null;
  contactCity: string | null;
  contactState: string | null;
  contactCountry: string | null;
  contactLocation: string | null;
  companyIndustry: string | null;
  industry: string | null;
  companyDescription: string | null;
  companyLinkedinUrl: string | null;
  // Full stripped Apollo person JSON (PII already removed before storage)
  enrichmentResponse: unknown;
}

export interface MarketplaceClaim {
  id: string;
  introductionRequestId: string;
  status: string;
  [key: string]: unknown;
}

export interface PublicProspectOrganization {
  name: string | null;
  website: string | null;
  logoUrl: string | null;
  industry: string | null;
  description: string | null;
  linkedinUrl: string | null;
}

export interface PublicProspect {
  name: string | null;
  title: string | null;
  headline: string | null;
  photoUrl: string | null;
  linkedinUrl: string | null;
  location: string | null;
  organization: PublicProspectOrganization | null;
}

export interface TransformedPublicRequestDetails {
  id: string;
  contactName: string;
  contactTitle: string;
  contactCompany: string;
  meetingTitle: string;
  meetingDescription: string;
  bountyAmount: number;
  isUrgent: boolean;
  createdAt: Date | string | null;
  claimerShare: number;
  sharerShare: number;
  isClaimed: boolean;
  interestedCount: number;
  viewCount: number;
  prospect: PublicProspect | null;
}

/**
 * Executes query to fetch public request details, joining the contact and its
 * enrichment so we can surface richer (but non-PII) prospect details.
 */
export async function getPublicRequestDetailsQuery(
  db: PostgresJsDatabase<typeof schema>,
  requestId: string
): Promise<PublicRequestDetails | null> {
  const [request] = await db
    .select({
      id: schema.introductionRequests.id,
      contactName: schema.introductionRequests.contactName,
      meetingTitle: schema.introductionRequests.meetingTitle,
      meetingDescription: schema.introductionRequests.meetingDescription,
      bountyAmount: schema.introductionRequests.bountyAmount,
      isUrgent: schema.introductionRequests.isUrgent,
      createdAt: schema.introductionRequests.createdAt,
      contactTitle: schema.contacts.title,
      contactCompany: schema.contacts.company,
      contactLinkedin: schema.contacts.linkedin,
      contactWebsite: schema.contacts.website,
      contactPhotoUrl: schema.contacts.profilePhotoUrl,
      contactCity: schema.contacts.city,
      contactState: schema.contacts.state,
      contactCountry: schema.contacts.country,
      contactLocation: schema.contacts.location,
      companyIndustry: schema.contacts.companyIndustry,
      industry: schema.contacts.industry,
      companyDescription: schema.contacts.companyDescription,
      companyLinkedinUrl: schema.contacts.companyLinkedinUrl,
      enrichmentResponse: schema.contactEnrichments.enrichmentResponse,
    })
    .from(schema.introductionRequests)
    // Join condition (not WHERE) so a missing/deleted contact yields null
    // fields instead of dropping the request row entirely.
    .leftJoin(
      schema.contacts,
      and(
        eq(schema.introductionRequests.contactId, schema.contacts.id),
        isNull(schema.contacts.deletedAt)
      )
    )
    .leftJoin(
      schema.contactEnrichments,
      eq(schema.contacts.id, schema.contactEnrichments.contactId)
    )
    .where(
      and(
        eq(schema.introductionRequests.id, requestId),
        eq(schema.introductionRequests.isMarketplaceVisible, true),
        eq(schema.introductionRequests.requesterArchived, false)
      )
    )
    .limit(1);

  return request || null;
}

/**
 * Checks if request is claimed
 */
export async function checkRequestClaimed(
  db: PostgresJsDatabase<typeof schema>,
  requestId: string
): Promise<MarketplaceClaim | null> {
  const [claim] = await db
    .select()
    .from(schema.marketplaceClaims)
    .where(
      and(
        eq(schema.marketplaceClaims.introductionRequestId, requestId),
        eq(schema.marketplaceClaims.status, "completed")
      )
    )
    .limit(1);

  return claim || null;
}

/** Returns a plain object if the value is a non-array object, else null. */
function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Returns a trimmed non-empty string, else null. */
function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Ensures an external URL has a scheme so it can't resolve as a relative link. */
function normalizeUrl(value: unknown): string | null {
  const url = asText(value);
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Joins non-empty location parts into "City, State, Country". */
function joinLocation(...parts: (string | null | undefined)[]): string | null {
  const cleaned = parts.map((p) => asText(p)).filter((p): p is string => !!p);
  return cleaned.length ? cleaned.join(", ") : null;
}

/**
 * Merges contact columns (primary) with the enrichment_response JSON
 * (fallback/augment) into a curated, public-safe prospect object.
 * Never throws and never leaks PII or the raw enrichment payload.
 */
export function buildPublicProspect(
  request: PublicRequestDetails
): PublicProspect | null {
  const enr = asRecord(request.enrichmentResponse) ?? {};
  const org = asRecord(enr.organization) ?? {};

  const organization: PublicProspectOrganization = {
    name: asText(request.contactCompany) ?? asText(org.name),
    website: normalizeUrl(request.contactWebsite ?? org.website_url),
    logoUrl: normalizeUrl(org.logo_url),
    industry:
      asText(request.companyIndustry) ??
      asText(request.industry) ??
      asText(org.industry),
    description:
      asText(request.companyDescription) ?? asText(org.short_description),
    linkedinUrl: normalizeUrl(request.companyLinkedinUrl ?? org.linkedin_url),
  };

  const hasOrg = Object.values(organization).some((v) => v !== null);

  const prospect: PublicProspect = {
    name: asText(request.contactName),
    title: asText(request.contactTitle) ?? asText(enr.title),
    headline: asText(enr.headline),
    photoUrl: normalizeUrl(request.contactPhotoUrl ?? enr.photo_url),
    linkedinUrl: normalizeUrl(request.contactLinkedin ?? enr.linkedin_url),
    location:
      asText(request.contactLocation) ??
      joinLocation(
        request.contactCity,
        request.contactState,
        request.contactCountry
      ) ??
      asText(enr.formatted_address) ??
      joinLocation(asText(enr.city), asText(enr.state), asText(enr.country)),
    organization: hasOrg ? organization : null,
  };

  const hasAny = Object.values(prospect).some((v) => v !== null);
  return hasAny ? prospect : null;
}

/**
 * Transforms raw request data into public format.
 * Builds the response explicitly to avoid leaking the raw enrichment JSON
 * or unused contact columns into the public payload.
 */
export function transformPublicRequestDetails(
  request: PublicRequestDetails,
  claim: MarketplaceClaim | null,
  interestedCount: number,
  viewCount = 0
): TransformedPublicRequestDetails {
  const bountyAmount = Number(request.bountyAmount) || 0;

  return {
    id: request.id,
    contactName: request.contactName ?? "",
    contactTitle: request.contactTitle ?? "",
    contactCompany: request.contactCompany ?? "",
    meetingTitle: request.meetingTitle ?? "",
    meetingDescription: request.meetingDescription ?? "",
    bountyAmount,
    isUrgent: request.isUrgent,
    createdAt: request.createdAt,
    claimerShare: bountyAmount * 0.5,
    sharerShare: bountyAmount * 0.5,
    isClaimed: !!claim,
    interestedCount,
    viewCount,
    prospect: buildPublicProspect(request),
  };
}
