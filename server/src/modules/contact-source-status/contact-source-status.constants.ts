export const CONTACT_SOURCE_STATUS_MESSAGES = {
  ERROR: {
    INVALID_PROVIDER: "Invalid provider",
    FAILED_TO_FETCH_STATUS: "Failed to fetch contact source status",
    UNKNOWN_ERROR: "Unknown error",
  },
};

export const PROVIDER_TO_SOURCE = {
  Google: "google_import",
  Microsoft: "microsoft_import",
  Apple: "apple_import",
  LinkedIn: "linkedin_import",
} as const;
