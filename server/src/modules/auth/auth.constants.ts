export const AUTH_MESSAGES = {
  INFO: {
    TOKEN_REFRESHED_SUCCESSFULLY: "Token refreshed successfully",
    LOGGED_OUT_SUCCESSFULLY: "Logged out successfully",
    ACCESS_TOKEN_REFRESHED_SUCCESSFULLY: "Access token refreshed automatically",
    STRIPE_CUSTOMER_CREATED_QUEUED: (userId: string) =>
      `✅ Stripe customer creation queued for user ${userId}`,
    STRIPE_CUSTOMER_ALREADY_EXISTS: (userId: string) =>
      `Stripe customer already exists for user ${userId}`,
  },
  ERROR: {
    REFRESH_TOKEN_NOT_FOUND: "Refresh token not found",
    GOOGLE_OAUTH_NOT_CONFIGURED: "Google OAuth not configured",
    MISSING_AUTHORIZATION_CODE: "Missing authorization code",
    INVALID_STATE_OR_CSRF_TOKEN: "Invalid state or CSRF token",
    NO_ID_TOKEN_RECEIVED_FROM_GOOGLE: "No id_token received from Google",
    MISSING_STATE_PARAMETER: "Missing state parameter (userId)",
    CONTACTS_SCOPE_NOT_GRANTED: "Contacts access was not granted",
    TOKEN_CREATION_FAILED: "Failed to create/update token record for user",
    IMPORT_QUEUED_FAILED:
      "Connection successful, but import queuing failed. You can retry the import.",
    IMPORT_SETUP_FAILED:
      "Connection successful, but import setup failed. You can retry the import.",
    GOOGLE_ACCOUNT_DOES_NOT_HAVE_A_VALID_EMAIL:
      "Google account does not have a valid email",
    USER_NOT_FOUND: "User not found",
    USER_ACCOUNT_INACTIVE:
      "Your account is inactive. Please contact support for assistance.",
    INVALID_TOKEN_TYPE: "Invalid token type",
    INVALID_REFRESH_TOKEN: "Invalid or expired refresh token",
    FAILED_TO_CONNECT_CALENDAR: (userId: string) =>
      `Failed to connect Google Calendar for user ${userId} during sign-in:`,
    FAILED_TO_QUEUE_GOOGLE_CONTACTS: (userId: string, error: AnyType) =>
      `❌ Failed to queue Google Contacts import for user ${userId}: ${error}`,
    PROFILE_NOT_FOUND: (userId: string) =>
      `Profile not found for user ${userId}`,
    STRIPE_CUSTOMER_CREATION_FAILED_ATTEMPT: (
      userId: string,
      attempt: number,
      maxRetries: number
    ) =>
      `Error creating Stripe customer for user ${userId} (attempt ${attempt}/${maxRetries}):`,
    STRIPE_CUSTOMER_CREATION_FAILED_FINAL: (
      userId: string,
      maxRetries: number
    ) =>
      `❌ Failed to create Stripe customer for user ${userId} after ${maxRetries} attempts`,
    // Microsoft OAuth errors
    MICROSOFT_OAUTH_NOT_CONFIGURED: "Microsoft OAuth not configured",
    MICROSOFT_ACCOUNT_DOES_NOT_HAVE_A_VALID_EMAIL:
      "Microsoft account does not have a valid email",
    NO_ACCESS_TOKEN_RECEIVED_FROM_MICROSOFT:
      "No access_token received from Microsoft",
    FAILED_TO_EXCHANGE_MICROSOFT_CODE:
      "Failed to exchange authorization code with Microsoft",
    FAILED_TO_FETCH_MICROSOFT_USER_PROFILE:
      "Failed to fetch user profile from Microsoft Graph API",
    FAILED_TO_CONNECT_MICROSOFT_CALENDAR: (userId: string) =>
      `Failed to connect Microsoft Calendar for user ${userId} during sign-in:`,
    FAILED_TO_QUEUE_MICROSOFT_CONTACTS: (userId: string, error: AnyType) =>
      `❌ Failed to queue Microsoft Contacts import for user ${userId}: ${error}`,
    REGISTRATION_REQUIRES_INVITE:
      "Registration requires an invite. Please contact your administrator for access.",
    OAUTH_SESSION_EXPIRED_TITLE: "Sign-in session expired",
    OAUTH_SESSION_EXPIRED_MESSAGE:
      "Your login session has expired. Please try signing in again",
    OAUTH_ACCESS_DENIED:
      "Sign-in was cancelled. Please try again and accept the requested permissions.",
    OAUTH_PROVIDER_ERROR:
      "Something went wrong during sign-in. Please try again.",
  },
};

/** User-facing OAuth callback errors safe to expose in sign-in redirect query params. */
export const OAUTH_REDIRECT_SAFE_ERROR_MESSAGES = new Set<string>([
  AUTH_MESSAGES.ERROR.USER_ACCOUNT_INACTIVE,
  AUTH_MESSAGES.ERROR.REGISTRATION_REQUIRES_INVITE,
  AUTH_MESSAGES.ERROR.GOOGLE_ACCOUNT_DOES_NOT_HAVE_A_VALID_EMAIL,
  AUTH_MESSAGES.ERROR.MICROSOFT_ACCOUNT_DOES_NOT_HAVE_A_VALID_EMAIL,
  AUTH_MESSAGES.ERROR.OAUTH_ACCESS_DENIED,
  AUTH_MESSAGES.ERROR.OAUTH_SESSION_EXPIRED_MESSAGE,
]);
