export interface BountyContactData {
  // From contacts table
  first_name?: string;
  last_name?: string;
  company?: string;
  title?: string;
  linkedin?: string;
  industry?: string;
  website?: string;
  company_domain?: string;
  company_industry?: string;
  company_description?: string;
  company_type?: string;
  location?: string;
  company_linkedin_url?: string;
  linkedin_connections?: string;
  employees?: string;
  // Existing bounty amount from contacts table (used for skip-if-exists check)
  bounty_amount?: string;
  // From contact_enrichments.enrichment_response JSONB
  seniority?: string;
  total_years_of_experience?: number;
  annual_revenue?: string;
  market_cap?: string;
  founded_year?: number;
}
