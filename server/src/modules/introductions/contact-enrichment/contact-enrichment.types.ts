export interface ApolloMatchRequest {
  id?: string;
  linkedin_url?: string;
  run_waterfall_email: boolean;
  run_waterfall_phone: boolean;
  reveal_personal_emails: boolean;
  reveal_phone_number: boolean;
}

export interface ApolloMatchOrganization {
  id?: string;
  name?: string;
  website_url?: string;
  linkedin_url?: string;
  primary_domain?: string;
  industry?: string;
  short_description?: string;
  estimated_num_employees?: number;
  phone?: string;
  primary_phone?: { number?: string; source?: string };
  founded_year?: number;
  city?: string;
  state?: string;
  country?: string;
  organization_revenue_printed?: string;
  annual_revenue_printed?: string;
  market_cap?: string;
  logo_url?: string;
  facebook_url?: string;
  twitter_url?: string;
}

export interface ApolloContactEmail {
  email?: string;
  email_status?: string;
}

export interface ApolloNestedContact {
  email?: string;
  contact_emails?: ApolloContactEmail[];
  phone_numbers?: unknown[];
  sanitized_phone?: string;
}

export interface ApolloMatchPerson {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  headline?: string;
  linkedin_url?: string;
  photo_url?: string;
  twitter_url?: string;
  github_url?: string;
  facebook_url?: string;
  city?: string;
  state?: string;
  country?: string;
  formatted_address?: string;
  email?: string;
  email_status?: string;
  personal_emails?: string[];
  phone?: string;
  seniority?: string;
  departments?: string[];
  subdepartments?: string[];
  functions?: string[];
  employment_history?: ApolloEmploymentHistory[];
  organization?: ApolloMatchOrganization;
  contact?: ApolloNestedContact;
}

export interface ApolloEmploymentHistory {
  _id?: string;
  current?: boolean;
  organization_name?: string;
  title?: string;
  start_date?: string;
  end_date?: string;
}

export interface ApolloMatchResponse {
  person: ApolloMatchPerson | null;
  request_id?: string;
}

export interface EnrichContactResponse {
  id: number;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  location: string | null;
  linkedin: string | null;
  profilePhotoUrl: string | null;
  companyDomain: string | null;
  companyIndustry: string | null;
  companyDescription: string | null;
  companyLinkedinUrl: string | null;
  companyType: string | null;
  employees: string | null;
  website: string | null;
  industry: string | null;
  linkedinConnections: string | null;
  bountyAmount: string | null;
  enrichmentStatus: string;
}

export interface EmploymentHistoryEntry {
  current: boolean;
  organizationName: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
}

/** Known values stored in contact_enrichments.enrichment_source */
export type EnrichmentSource = "apollo" | "zoom_info" | "clay";

export function parseEnrichmentSource(
  value: string | null | undefined
): EnrichmentSource | null {
  if (value === "apollo" || value === "zoom_info" || value === "clay") {
    return value;
  }
  return null;
}

export interface ContactDetailsResponse extends EnrichContactResponse {
  // Enrichment person fields
  headline: string | null;
  seniority: string | null;
  departments: string[] | null;
  functions: string[] | null;
  employmentHistory: EmploymentHistoryEntry[] | null;

  // Social URLs
  twitterUrl: string | null;
  githubUrl: string | null;
  facebookUrl: string | null;

  // Organization enrichment fields
  companyFoundedYear: number | null;
  companyRevenue: string | null;
  companyMarketCap: string | null;
  companyPhone: string | null;
  companyCity: string | null;
  companyState: string | null;
  companyCountry: string | null;
  companyLogoUrl: string | null;
  companyFacebookUrl: string | null;
  companyTwitterUrl: string | null;
  companyPrimaryDomain: string | null;

  // Email verification
  emailStatus: string | null;

  // Connector count (from contact_relationships)
  connectorCount: number;

  // Whether the contact has an email address (required for introductions)
  hasEmail: boolean;

  enrichmentSource: EnrichmentSource | null;
}
