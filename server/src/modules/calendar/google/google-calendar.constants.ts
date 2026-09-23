export const GOOGLE_CALENDAR_MESSAGES = {
  INFO: {
    FETCHED_CALENDAR_EMAIL: (email: string) =>
      `Successfully fetched calendar email: ${email}`,
    FETCHED_CALENDAR_EMAIL_FOR_USER: (userId: string, email: string) =>
      `Successfully fetched calendar email for user ${userId}: ${email}`,
    CONNECTED_GOOGLE_CALENDAR: (userId: string, email?: string | null) =>
      `✅ Successfully connected Google Calendar for user ${userId}${email ? ` (${email})` : ""}`,
  },
  ERROR: {
    GOOGLE_OAUTH_NOT_CONFIGURED: "Google OAuth not configured",
    FAILED_TO_OBTAIN_ACCESS_TOKEN: "Failed to obtain access token",
    ACCESS_TOKEN_REQUIRED: "Access token is required",
    GOOGLE_CALENDAR_NOT_CONNECTED: "Google Calendar not connected",
    GOOGLE_CREDENTIALS_NOT_CONFIGURED:
      "Google OAuth credentials not configured",
    GOOGLE_TOKEN_REFRESH_FAILED: "Google token refresh failed",
    GOOGLE_API_ERROR: "Google Calendar API error",
    FAILED_TO_FETCH_CALENDAR_INFO: (userId: string) =>
      `Failed to fetch calendar info for user ${userId}:`,
    FAILED_TO_FETCH_USER_EMAIL_API: (userId: string) =>
      `Failed to fetch user email from calendar API for user ${userId}:`,
    FAILED_TO_FETCH_WORKING_LOCATION: "Error fetching working location events:",
    FAILED_TO_FETCH_TIMEZONE: "Error fetching Google Calendar timezone:",
    FAILED_TO_CALCULATE_TZ_OFFSET: (timezone: string) =>
      `Error calculating timezone offset for ${timezone}:`,
  },
};
