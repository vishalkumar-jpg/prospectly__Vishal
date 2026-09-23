export const MICROSOFT_CALENDAR_MESSAGES = {
  INFO: {
    MICROSOFT_CONNECTED: "Microsoft Calendar connected successfully",
  },
  ERROR: {
    MICROSOFT_OAUTH_NOT_CONFIGURED:
      "Microsoft Calendar integration is not configured",
    MICROSOFT_SUPPORT_REQUIRED:
      "Microsoft Calendar integration is not configured. Please contact support to enable this feature.",
    MICROSOFT_TOKEN_EXCHANGE_FAILED: "Failed to exchange authorization code",
    MICROSOFT_CALENDAR_NOT_CONNECTED: "Microsoft Calendar not connected",
    MICROSOFT_TOKEN_REFRESH_FAILED: "Microsoft token refresh failed",
    MICROSOFT_GRAPH_API_ERROR: "Microsoft Graph API error",
    FAILED_TO_FETCH_USER_EMAIL_API: (userId: string) =>
      `Failed to fetch user email from calendar API for user ${userId}:`,
  },
};
