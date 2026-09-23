export const CALENDAR_MESSAGES = {
  INFO: {
    CALENDAR_CONNECTED: "Calendar connected successfully",
    CALENDAR_DISCONNECTED: "Calendar disconnected successfully",
    INTEGRATION_DISCONNECTED: "Calendar integration disconnected successfully",
    MICROSOFT_CONNECTED: "Microsoft Calendar connected successfully",
  },
  ERROR: {
    MISSING_AUTH_CODE_OR_STATE: "Missing authorization code or state parameter",
    UNKNOWN_ERROR: "Unknown error",
    NO_CALENDAR_INTEGRATION_FOUND: (userId: string) =>
      `No calendar integration found for user ${userId}`,
    FAILED_TO_FETCH_AVAILABLE_SLOTS: "Error fetching available slots:",
    GOOGLE_OAUTH_NOT_CONFIGURED: "Google OAuth not configured",
    MICROSOFT_OAUTH_NOT_CONFIGURED: "Microsoft OAuth not configured",
  },
};
