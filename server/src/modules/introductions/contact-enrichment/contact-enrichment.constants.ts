export const CONTACT_ENRICHMENT_CONSTANTS = {
  APOLLO_MATCH_ENDPOINT:
    "/api/v1/people/match?run_waterfall_email=false&run_waterfall_phone=false&reveal_personal_emails=true&reveal_phone_number=false",
  ENRICHMENT_SOURCE: "apollo",
  ENRICHMENT_SOURCE_ZOOM_INFO: "zoom_info",
  CONTACT_SOURCE: "apollo_enrichment",
  ENRICHMENT_STATUS_COMPLETED: "completed",
  ENRICHMENT_STATUS_FAILED: "failed",
} as const;

export const CONTACT_ENRICHMENT_MESSAGES = {
  SUCCESS: {
    ENRICHED: "Contact enriched successfully",
  },
  ERROR: {
    APOLLO_API_FAILED: "Apollo enrichment API call failed",
    CONTACT_NOT_FOUND: "Contact not found",
    APOLLO_NO_MATCH: "No matching person found in Apollo",
  },
} as const;

export const CONTACT_ENRICHMENT_LOG = {
  CONTROLLER: "CONTACT_ENRICHMENT_CONTROLLER",
  SERVICE: "CONTACT_ENRICHMENT_SERVICE",
  APOLLO_SERVICE: "CONTACT_ENRICHMENT_APOLLO_SERVICE",
  DB_SERVICE: "CONTACT_ENRICHMENT_DB_SERVICE",
  TYPESENSE_SERVICE: "CONTACT_ENRICHMENT_TYPESENSE_SERVICE",
} as const;
