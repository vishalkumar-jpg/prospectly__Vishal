import type { Contact } from "database/schema/contacts";
import type {
  ApolloMatchPerson,
  ApolloNestedContact,
  ContactDetailsResponse,
  EmploymentHistoryEntry,
  EnrichContactResponse,
  EnrichmentSource,
} from "./contact-enrichment.types";
import { CONTACT_ENRICHMENT_CONSTANTS } from "./contact-enrichment.constants";
import { formatZoomInfoCompanyRevenue } from "./zoom-info-revenue-formatter";

function resolveCompanyRevenue(
  org: Record<string, unknown>,
  enrichmentSource: EnrichmentSource | null
): string | null {
  const raw =
    (org.annual_revenue_printed as string) ??
    (org.organization_revenue_printed as string) ??
    null;
  if (!raw?.trim()) return null;
  if (
    enrichmentSource ===
    CONTACT_ENRICHMENT_CONSTANTS.ENRICHMENT_SOURCE_ZOOM_INFO
  ) {
    return formatZoomInfoCompanyRevenue(raw);
  }
  return raw;
}

/**
 * Maps Apollo person + organization data to contacts table column names.
 * Returns only fields that have non-null/non-empty values in the Apollo response.
 */
export function mapApolloToContactFields(
  person: ApolloMatchPerson
): Partial<Contact> {
  const org = person.organization;
  const mapped: Partial<Contact> = {};

  if (person.first_name) mapped.firstName = person.first_name;
  if (person.last_name) mapped.lastName = person.last_name;
  if (person.title) mapped.title = person.title;
  if (person.city) mapped.city = person.city;
  if (person.state) mapped.state = person.state;
  if (person.country) mapped.country = person.country;
  if (person.formatted_address) mapped.location = person.formatted_address;
  if (person.linkedin_url) mapped.linkedin = person.linkedin_url;
  if (person.photo_url) mapped.profilePhotoUrl = person.photo_url;

  if (org) {
    if (org.name) mapped.company = org.name;
    if (org.primary_domain) mapped.companyDomain = org.primary_domain;
    if (org.industry) mapped.companyIndustry = org.industry;
    if (org.short_description)
      mapped.companyDescription = org.short_description;
    if (org.linkedin_url) mapped.companyLinkedinUrl = org.linkedin_url;
    if (org.website_url) mapped.website = org.website_url;
    if (org.estimated_num_employees != null) {
      mapped.employees = String(org.estimated_num_employees);
    }
  }

  return mapped;
}

/**
 * Returns an object containing only the fields where `existing` is null/undefined
 * and `incoming` has a non-null value. Used to fill nullable columns without overwriting.
 */
export function fillNullableFields<T extends Record<string, unknown>>(
  existing: T,
  incoming: Partial<T>
): Partial<T> {
  const updates: Partial<T> = {};

  for (const key of Object.keys(incoming) as Array<keyof T>) {
    if (
      (existing[key] === null || existing[key] === undefined) &&
      incoming[key] != null
    ) {
      updates[key] = incoming[key] as T[keyof T];
    }
  }

  return updates;
}

/**
 * Extracts all emails from Apollo response, deduplicates, and returns in priority order.
 * Priority: person.email → person.contact.email → person.contact.contact_emails[] → person.personal_emails[]
 * All emails are normalized (lowercase + trim) and deduplicated.
 */
export function extractEmailsFromApollo(person: ApolloMatchPerson): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const addEmail = (raw: string | undefined | null) => {
    if (!raw) return;
    const normalized = raw.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  };

  // Source 1: Root person email (work email, highest priority)
  addEmail(person.email);

  // Source 2: Nested contact email
  addEmail(person.contact?.email);

  // Source 3: Nested contact_emails array
  if (person.contact?.contact_emails) {
    for (const entry of person.contact.contact_emails) {
      addEmail(entry.email);
    }
  }

  // Source 4: Personal emails (lowest priority)
  if (person.personal_emails) {
    for (const pe of person.personal_emails) {
      addEmail(pe);
    }
  }

  return result;
}

/**
 * Strips person-level PII from Apollo response for storage in enrichment_response.
 * Removes: email, personal_emails, phone.
 * Keeps: organization-level phone (public business info).
 */
export function stripPersonPiiFromResponse(
  person: ApolloMatchPerson
): Record<string, unknown> {
  const { email, personal_emails, phone, contact, ...safe } = person;
  // Suppress unused variable warnings
  void email;
  void personal_emails;
  void phone;

  // Strip PII from nested contact object if present
  if (contact) {
    const {
      email: _contactEmail,
      contact_emails: _contactEmails,
      phone_numbers: _phoneNumbers,
      sanitized_phone: _sanitizedPhone,
      ...safeContact
    } = contact as ApolloNestedContact & Record<string, unknown>;
    void _contactEmail;
    void _contactEmails;
    void _phoneNumbers;
    void _sanitizedPhone;
    (safe as Record<string, unknown>).contact = safeContact;
  }

  return safe as Record<string, unknown>;
}

/**
 * Builds the EnrichContactResponse from a DB contact record.
 * Excludes email and phone (PII).
 */
export function buildEnrichContactResponse(
  contact: Contact,
  enrichmentStatus: string
): EnrichContactResponse {
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    title: contact.title,
    company: contact.company,
    city: contact.city,
    state: contact.state,
    country: contact.country,
    location: contact.location,
    linkedin: contact.linkedin,
    profilePhotoUrl: contact.profilePhotoUrl,
    companyDomain: contact.companyDomain,
    companyIndustry: contact.companyIndustry,
    companyDescription: contact.companyDescription,
    companyLinkedinUrl: contact.companyLinkedinUrl,
    companyType: contact.companyType,
    employees: contact.employees,
    website: contact.website,
    industry: contact.industry,
    linkedinConnections: contact.linkedinConnections,
    bountyAmount: contact.bountyAmount,
    enrichmentStatus,
  };
}

/**
 * Builds a ContactDetailsResponse by merging contact table fields
 * with curated fields from the enrichment_response JSONB.
 * Extracts only key display fields — skips technologies, keywords, etc.
 */
export function buildContactDetailsResponse(
  contact: Contact,
  enrichmentStatus: string,
  enrichmentResponse: Record<string, unknown> | null,
  connectorCount = 0,
  hasEmail = false,
  enrichmentSource: EnrichmentSource | null = null
): ContactDetailsResponse {
  const base = buildEnrichContactResponse(contact, enrichmentStatus);

  if (!enrichmentResponse) {
    return {
      ...base,
      headline: null,
      seniority: null,
      departments: null,
      functions: null,
      employmentHistory: null,
      twitterUrl: null,
      githubUrl: null,
      facebookUrl: null,
      companyFoundedYear: null,
      companyRevenue: null,
      companyMarketCap: null,
      companyPhone: null,
      companyCity: null,
      companyState: null,
      companyCountry: null,
      companyLogoUrl: null,
      companyFacebookUrl: null,
      companyTwitterUrl: null,
      companyPrimaryDomain: null,
      emailStatus: null,
      connectorCount,
      hasEmail,
      enrichmentSource,
    };
  }

  const person = enrichmentResponse as Record<string, unknown>;
  const org = (person.organization as Record<string, unknown>) ?? {};

  // Map employment history entries
  let employmentHistory: EmploymentHistoryEntry[] | null = null;
  const rawHistory = person.employment_history;
  if (Array.isArray(rawHistory) && rawHistory.length > 0) {
    employmentHistory = rawHistory.map((entry: Record<string, unknown>) => ({
      current: Boolean(entry.current),
      organizationName: String(entry.organization_name ?? ""),
      title: String(entry.title ?? ""),
      startDate: (entry.start_date as string) ?? null,
      endDate: (entry.end_date as string) ?? null,
    }));
  }

  return {
    ...base,
    headline: (person.headline as string) ?? null,
    seniority: (person.seniority as string) ?? null,
    departments: (person.departments as string[]) ?? null,
    functions: (person.functions as string[]) ?? null,
    employmentHistory,
    twitterUrl: (person.twitter_url as string) ?? null,
    githubUrl: (person.github_url as string) ?? null,
    facebookUrl: (person.facebook_url as string) ?? null,
    companyFoundedYear: (org.founded_year as number) ?? null,
    companyRevenue: resolveCompanyRevenue(org, enrichmentSource),
    companyMarketCap: (org.market_cap as string) ?? null,
    companyPhone: (org.phone as string) ?? null,
    companyCity: (org.city as string) ?? null,
    companyState: (org.state as string) ?? null,
    companyCountry: (org.country as string) ?? null,
    companyLogoUrl: (org.logo_url as string) ?? null,
    companyFacebookUrl: (org.facebook_url as string) ?? null,
    companyTwitterUrl: (org.twitter_url as string) ?? null,
    companyPrimaryDomain: (org.primary_domain as string) ?? null,
    emailStatus: (person.email_status as string) ?? null,
    connectorCount,
    hasEmail,
    enrichmentSource,
  };
}
