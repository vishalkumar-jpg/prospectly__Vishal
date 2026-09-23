export const CONTACTS_MESSAGES = {
  ERROR: {
    FAILED_TO_CREATE_CONTACT: "Failed to create contact",
    PAGE_MUST_BE_GREATER_THAN_0: "Page must be greater than 0",
    LIMIT_MUST_BE_BETWEEN_1_AND_100: "Limit must be between 1 and 100",
    SEARCH_QUERY_TOO_SHORT: "Search query must be at least 2 characters",
    CONTACT_NOT_FOUND: "Contact not found",
    CONTACT_RELATIONSHIP_NOT_FOUND: "Contact relationship not found",
    EMAIL_ALREADY_EXISTS:
      "Email address cannot be updated. Contact already has an email address.",
    EMAIL_ALREADY_IN_USE:
      "This email address is already associated with another contact",

    // Google
    GOOGLE_OAUTH_NOT_CONFIGURED: "Google OAuth not configured",
    NO_ACCESS_TOKEN_FROM_GOOGLE: "No access token received from Google",
    CONTACTS_ACCESS_NOT_GRANTED: "Contacts access was not granted",
    FAILED_TO_SAVE_GOOGLE_CONNECTION: "Failed to save Google connection",
    GOOGLE_ACCOUNT_NOT_CONNECTED:
      "Google account not connected. Please sign in with Google first.",

    // Apple
    APPLE_ACCOUNT_NOT_CONNECTED:
      "Apple account not connected. Please connect your Apple account first.",
    APPLE_CREDENTIALS_NOT_FOUND:
      "Apple credentials not found. Please reconnect your Apple account.",
    APPLE_ID_PASSWORD_REQUIRED:
      "Apple ID and App-Specific Password are required",
    FAILED_TO_SAVE_APPLE_CONNECTION: "Failed to save Apple connection",
    INVALID_APPLE_CREDENTIALS:
      "Invalid Apple ID or App-Specific Password. Please verify your credentials and reconnect.",

    // Microsoft
    MICROSOFT_IMPORT_NOT_CONFIGURED:
      "Microsoft contact import is not configured. Please ask your administrator to set up MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET environment variables.",
    MICROSOFT_OAUTH_NOT_CONFIGURED: "Microsoft OAuth not configured",
    FAILED_TO_EXCHANGE_CODE: "Failed to exchange code for token",
    NO_ACCESS_TOKEN_FROM_MICROSOFT: "No access token received from Microsoft",
    FAILED_TO_FETCH_MICROSOFT_CONTACTS:
      "Failed to fetch contacts from Microsoft",
    FAILED_TO_FETCH_MICROSOFT_USER:
      "Failed to fetch Microsoft user info. Please contact Prospectly admin.",
    FAILED_TO_SAVE_MICROSOFT_CONNECTION: "Failed to save Microsoft connection",
    MICROSOFT_ACCOUNT_NOT_CONNECTED:
      "Microsoft account not connected. Please connect your Microsoft account first.",

    // Common
    IMPORT_QUEUING_FAILED:
      "Connection successful, but import queuing failed. You can retry the import.",
    IMPORT_SETUP_FAILED: "Connection successful, but import setup failed",
    IMPORT_ALREADY_IN_PROGRESS: (provider: string) =>
      `Contacts import is already in progress for ${provider}. Please wait for the current import to complete.`,
    MISSING_AUTH_CODE: "Missing authorization code",
    BOUNTY_AMOUNT_REQUIRED: "Referral payout amount is required",
    INVALID_BOUNTY_AMOUNT: "Referral payout amount must be a valid number",
    BOUNTY_AMOUNT_MUST_BE_WHOLE_NUMBER:
      "Referral payout amount must be a whole number (no decimals allowed)",
    BOUNTY_AMOUNT_MUST_BE_POSITIVE:
      "Referral payout amount must be greater than 0",
    BOUNTY_AMOUNT_EXCEEDS_MAXIMUM: (maxAmount: number) =>
      `Referral payout amount cannot exceed $${maxAmount.toLocaleString()} (Stripe maximum limit)`,
    UNKNOWN_ERROR: "Unknown error",
    FAILED_TO_UPDATE_GOOGLE_TOKENS: (userId: string) =>
      `[Fallback] Failed to create/update token record for user ${userId}:`,
    FAILED_TO_QUEUE_GOOGLE_IMPORT: (userId: string, importRecordId: string) =>
      `[Fallback] ❌ Failed to queue import job for user ${userId}, import record ${importRecordId}:`,
    FAILED_TO_CREATE_IMPORT_RECORD: (userId: string) =>
      `[Fallback] Failed to create import record for user ${userId}:`,
    FAILED_TO_DECRYPT_TOKENS: (error: string) =>
      `Failed to decrypt tokens: ${error}`,
  },
  INFO: {
    GOOGLE_CONTACTS_RESYNC_QUEUED: "Google Contacts resync queued",
    APPLE_CONTACTS_RESYNC_QUEUED: "Apple Contacts resync queued",
    MICROSOFT_CONTACTS_RESYNC_QUEUED: "Microsoft Contacts resync queued",
    NO_CONTACTS_FOUND: "No contacts found.",
    NO_CONTACTS_WITH_DETAILS_FOUND: "No contacts with email or phone found.",
    ATTEMPTING_GOOGLE_TOKEN_UPDATE: (userId: string) =>
      `[Fallback] Attempting to create/update Google token record for user ${userId}`,
    GOOGLE_IMPORT_QUEUED: (
      jobId: string,
      userId: string,
      importRecordId: string
    ) =>
      `[Fallback] ✅ Successfully queued Google Contacts import job ${jobId} for user ${userId}, import record ${importRecordId}`,
    EXTRACTED_EMAIL_ID_TOKEN: (email: string) =>
      `Successfully extracted Google user email from id_token: ${email}`,
    FETCHED_EMAIL_USERINFO_API: (email: string) =>
      `Successfully fetched Google user email from userinfo API: ${email}`,
    ACCOUNT_ALREADY_CONNECTED_IMPORT: "This account is already connected.",
    BOUNTY_AMOUNT_UPDATED: (
      contactId: number,
      amount: string,
      userId: string
    ) =>
      `Updated referral payout amount for contact ${contactId} to ${amount} for user ${userId}`,
  },
  WARNING: {
    FAILED_TO_EXTRACT_EMAIL_ID_TOKEN: "Failed to extract email from id_token",
    FAILED_TO_FETCH_EMAIL_USERINFO:
      "Failed to fetch user email from Google userinfo API",
    COULD_NOT_RETRIEVE_EMAIL:
      "Could not retrieve email for Google account. Token record will be created without email.",
    APPLE_CREDENTIALS_TEST_FAILED:
      "Apple credentials test failed during resync",
    FAILED_TO_DEACTIVATE_TOKENS: "Failed to deactivate tokens",
  },
};

export const CONTACT_LIST_SORT_BY = [
  "contact",
  "email",
  "company",
  "linkedin",
  "bountyAmount",
  "source",
  "updatedAt",
] as const;

export type ContactListSortBy = (typeof CONTACT_LIST_SORT_BY)[number];

export const CONTACT_LIST_SORT_DIR = ["desc", "asc", "default"] as const;

export type ContactListSortDir = (typeof CONTACT_LIST_SORT_DIR)[number];
