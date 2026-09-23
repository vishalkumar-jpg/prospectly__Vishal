export interface TypesenseContactDocument {
  id: string;
  contact_id: string;
  first_name: string;
  last_name: string;
  title: string;
  linkedin: string;
  linkedin_connections: string;
  location: string;
  city: string;
  state: string;
  country: string;
  industry: string;
  company: string;
  company_description: string;
  company_type: string;
  company_industry: string;
  company_domain: string;
  company_linkedin_url: string;
  employees: string;
  website: string;
  has_email: boolean;
  has_linkedin: boolean;
  profile_photo_url: string;
  bounty_amount: number;
  enrichment_status: string;
  enrichment_source: string;
  external_person_id: string;
}

export interface BulkUpsertResult {
  totalDocuments: number;
  successCount: number;
  failedDocumentIds: string[];
}

export interface TypesenseSearchParams {
  q?: string;
  linkedinUrl?: string;
  name?: string;
  title?: string;
  company?: string;
  website?: string;
  location?: string;
  limit?: number;
  page?: number;
}

export interface ApolloCacheDocument {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  has_email: boolean;
  has_direct_phone: boolean;
  company: string;
  has_industry: boolean;
  has_revenue: boolean;
  has_employee_count: boolean;
  bounty_amount: number;
}

export type SearchResultDocument =
  | TypesenseContactDocument
  | ApolloCacheDocument;

export interface TypesenseHit {
  document: Record<string, unknown>;
  text_match_info?: { score: number };
  text_match?: number;
}

export interface TypesenseSearchResult {
  hits?: TypesenseHit[];
  found?: number;
}

export interface TypesenseSearchResponse {
  contacts: SearchResultDocument[];
  count: number;
  query: string;
  hasNextPage: boolean;
}
