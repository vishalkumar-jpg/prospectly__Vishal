export const MEETING_STATUS = {
  SCHEDULED: "scheduled",
  CONFIRMED: "confirmed",
  NOT_STARTED: "not_started",
  ONGOING: "ongoing",
  COMPLETED: "completed",
} as const;

export const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

export const GOOGLE_API_ENDPOINTS = {
  TOKEN_REFRESH: "https://oauth2.googleapis.com/token",
  MEET_API_BASE: "https://meet.googleapis.com/v2",
} as const;

export const MICROSOFT_API_ENDPOINTS = {
  TOKEN_REFRESH: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  GRAPH_API_BASE: "https://graph.microsoft.com/v1.0",
} as const;

export { PERSONAL_ACCOUNT_DOMAINS } from "constants/microsoft-account.constants";

export const HTTP_STATUS = {
  FORBIDDEN: 403,
} as const;

export const ERROR_REASONS = {
  ACCESS_TOKEN_SCOPE_INSUFFICIENT: "ACCESS_TOKEN_SCOPE_INSUFFICIENT",
} as const;

export const GOOGLE_MEET_URL_PATTERN = /meet\.google\.com\/([a-z-]+)/;

export const MEETINGS_MESSAGES = {
  INFO: {
    JOB_STARTED: "🔄 AUTO-COMPLETE JOB STARTED - Running every 10 minutes",
    JOB_SUMMARY: "📈 AUTO-COMPLETE JOB SUMMARY:",
    COMPLETED_COUNT: (count: number) => `   ✅ Completed: ${count}`,
    ONGOING_COUNT: (count: number) => `   ⏳ Ongoing: ${count}`,
    NOT_STARTED_COUNT: (count: number) => `   ❌ Not Started: ${count}`,
  },
  ERROR: {
    PROCESSING_MEETING: (id: string, error: string) =>
      `❌ Error processing meeting ${id}: ${error}`,
    JOB_FAILED: "❌ ERROR in auto-complete job:",
    DIVIDER: "===================================================\n",
    CONFERENCE_ID_MISSING: (id: string) =>
      `❌ Could not extract conference ID from meeting ${id}`,
    GOOGLE_INTEGRATION_MISSING: (id: string) =>
      `❌ No Google integration found for organizer ${id}`,
    ACCESS_TOKEN_FAILED: (id: string) =>
      `❌ Failed to obtain valid access token for meeting ${id}`,
    OAUTH_NOT_CONFIGURED: "❌ Google OAuth credentials not configured",
    TOKEN_REFRESH_FAILED: (error: string) =>
      `❌ Token refresh failed: ${error}`,
    TOKEN_REFRESH_ERROR: (error: string) => `❌ Token refresh error: ${error}`,
    MEET_API_ERROR: (status: number, error: string) =>
      `❌ Google Meet API error (${status}): ${error}`,
    MEET_API_CALL_FAILED: (error: string) =>
      `❌ Error calling Google Meet API: ${error}`,
    UPDATE_REQUEST_FAILED: (id: string, error: string) =>
      `❌ Error updating introduction request ${id}: ${error}`,
    MICROSOFT_INTEGRATION_MISSING: (userId: string, meetingId?: string) =>
      `❌ [Microsoft Cron] No Microsoft calendar integration found for user ${userId}${meetingId ? ` (meeting: ${meetingId})` : ""}. User needs to connect Microsoft calendar.`,
    MICROSOFT_API_ERROR: (
      status: number,
      error: string,
      operation: string,
      url?: string
    ) =>
      `❌ [Microsoft Cron] Graph API error during ${operation} - Status: ${status}${url ? `, URL: ${url}` : ""}, Error: ${error}`,
    MICROSOFT_API_CALL_FAILED: (operation: string, error: string) =>
      `❌ [Microsoft Cron] Failed to call Microsoft Graph API during ${operation}: ${error}`,
    MICROSOFT_OAUTH_NOT_CONFIGURED: (operation?: string) =>
      `❌ [Microsoft Cron] Microsoft OAuth credentials not configured${operation ? ` (operation: ${operation})` : ""}. Check MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET environment variables.`,
    MICROSOFT_CALENDAR_EVENT_FETCH_FAILED: (
      status: number,
      error: string,
      meetingId: string,
      eventId?: string,
      url?: string
    ) =>
      `❌ [Microsoft Cron] Failed to fetch calendar event for meeting ${meetingId}${eventId ? ` (event ID: ${eventId})` : ""} - Status: ${status}${url ? `, URL: ${url}` : ""}, Error: ${error}`,
    MICROSOFT_TOKEN_REFRESH_FAILED: (
      status: number,
      error: string,
      userId: string
    ) =>
      `❌ [Microsoft Cron] Failed to refresh Microsoft OAuth token for user ${userId} - Status: ${status}, Error: ${error}. Token may be invalid or expired.`,
    MICROSOFT_MEETING_NOT_FOUND: (
      joinUrl: string,
      userEmail?: string,
      meetingId?: string
    ) =>
      `⚠️ [Microsoft Cron] Online meeting not found${meetingId ? ` (meeting: ${meetingId})` : ""} - Join URL: ${joinUrl}${userEmail ? `, User: ${userEmail}` : ""}. Meeting may not exist or user may not have access.`,
    MICROSOFT_ATTENDANCE_REPORTS_FAILED: (
      status: number,
      error: string,
      meetingId: string,
      onlineMeetingId: string
    ) =>
      `⚠️ [Microsoft Cron] Failed to fetch attendance reports for meeting ${meetingId} (online meeting: ${onlineMeetingId}) - Status: ${status}, Error: ${error}. Reports may not be available yet or permissions may be insufficient.`,
    MICROSOFT_PERSONAL_ACCOUNT_DETECTED: (joinUrl: string, email: string) =>
      `⚠️ [Microsoft Cron] Personal Microsoft account detected (${email}) - OnlineMeetings API not supported. Using Calendar Events API instead. Join URL: ${joinUrl}`,
    MICROSOFT_CALENDAR_EVENT_NOT_FOUND: (
      meetingId: string,
      eventId?: string,
      meetingDate?: string
    ) =>
      `⚠️ [Microsoft Cron] Calendar event not found for meeting ${meetingId}${eventId ? ` (event ID: ${eventId})` : ""}${meetingDate ? `, Date: ${meetingDate}` : ""}. Event may have been deleted or meeting link doesn't match.`,
  },
  WARNING: {
    SCOPE_INSUFFICIENT:
      "⚠️  Access token scope insufficient - skipping meeting",
  },
} as const;
