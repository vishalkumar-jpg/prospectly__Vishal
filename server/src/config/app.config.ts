import { CONTACT_IMPORT_MAX_ACCOUNTS_PER_PROVIDER } from "modules/contact-queue/contact-queue.constants";
import { DEFAULT_EMAIL_CONFIG } from "modules/introductions/introductions.constants";
import { getOsEnv, getOsEnvOptional } from "./env.config";

export const appConfig = {
  port: parseInt(getOsEnv("PORT") || "5000", 10),
  environment: getOsEnv("NODE_ENV") || "development",
  isProduction: getOsEnvOptional("NODE_ENV") === "production",
  apiPrefix: "api",
  throttle: {
    // Default: 60 seconds TTL window, 100 requests per window (per IP)
    // More restrictive limits should be applied per-endpoint for auth routes
    ttl: +getOsEnv("THROTTLE_TTL") || 60000,
    limit: +getOsEnv("THROTTLE_LIMIT") || 100,
  },
  sentryDsn: getOsEnv("SENTRY_DSN"),
  loginBlockDuration: +getOsEnv("LOGIN_BLOCK_DURATION"),
  maxLoginAttempts: +getOsEnv("MAX_LOGIN_ATTEMPTS"),
  cookieDomain: getOsEnv("COOKIE_DOMAIN"),
  cookiePrefix: getOsEnvOptional("COOKIE_PREFIX") || "",
  get cookieNames() {
    const prefix = this.cookiePrefix ? `${this.cookiePrefix}_` : "";
    return {
      accessToken: `${prefix}access_token`,
      refreshToken: `${prefix}refresh_token`,
      csrfToken: `${prefix}csrf_token`,
      oauthNonce: `${prefix}oauth_nonce`,
    };
  },
  frontendUrl: getOsEnv("FRONTEND_URL"),
  adminPanelUrl: getOsEnvOptional("ADMIN_PANEL_URL") ?? "",
  apiUrl: getOsEnv("API_URL"),
  corsOrigins:
    getOsEnvOptional("CORS_ORIGINS")
      ?.split(",")
      .map((o) => o.trim())
      .filter(Boolean) || [],
  documents: {
    allowedFileTypes: getOsEnvOptional("ALLOWED_FILE_TYPES")?.split(","),
  },
  presigned: {
    minFileSize: getOsEnvOptional("PRESIGNED_MIN_FILE_SIZE"),
    maxFileSize: getOsEnvOptional("PRESIGNED_MAX_FILE_SIZE"),
  },
  resend: {
    fromEmail: getOsEnv("RESEND_FROM_EMAIL") || DEFAULT_EMAIL_CONFIG.FROM,
  },
  /** Max active contact-import OAuth/credential rows per user per provider (google, microsoft, apple). */
  contactImportMaxAccountsPerProvider: CONTACT_IMPORT_MAX_ACCOUNTS_PER_PROVIDER,
};
