export interface ApolloSearchParams {
  q_keywords?: string;
  q_organization_name?: string;
  q_organization_domains_list?: string[];
  person_titles?: string[];
  person_locations?: string[];
  per_page?: number;
  page?: number;
}

export interface ApolloPersonOrganization {
  name?: string;
  has_industry?: boolean;
  has_revenue?: boolean;
  has_employee_count?: boolean;
}

export interface ApolloPersonResult {
  id: string;
  first_name: string;
  last_name_obfuscated: string;
  title: string;
  has_email: boolean;
  has_direct_phone: boolean | string;
  organization?: ApolloPersonOrganization;
}

export interface ApolloSearchResponse {
  total_entries: number;
  people: ApolloPersonResult[];
}
