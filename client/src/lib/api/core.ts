/**
 * Core API Infrastructure
 *
 * Provides shared utilities for API requests including:
 * - ApiError class for standardized error handling
 * - Token management (refresh, expiration tracking)
 * - CSRF token handling
 * - Request function with automatic retry on 401
 */

import type { AnyType } from "../../types/common";
import { toUTC } from "../dayjs";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: AnyType
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Get CSRF token from cookie
 * Enhanced to handle edge cases with cookie domain changes
 */
function getCSRFToken(): string | null {
  try {
    const prefix = import.meta.env.VITE_COOKIE_PREFIX;
    const cookieName = prefix ? `${prefix}_csrf_token` : "csrf_token";
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      // Handle cookies that may have '=' in their value
      const [name, ...valueParts] = trimmed.split("=");
      if (name === cookieName) {
        const value = valueParts.join("="); // Rejoin in case value contains '='
        return value ? decodeURIComponent(value) : null;
      }
    }
  } catch {
    // Silently ignored - cookie parsing may fail in some environments
  }
  return null;
}

// Track if a token refresh is in progress to prevent multiple simultaneous refreshes
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Token expiration tracking (in-memory)
let tokenExpiresAt: number | null = null;

// Constants for token expiration
const TOKEN_LIFETIME_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes buffer

// List of endpoints that should NOT trigger token refresh (to prevent infinite loops)
const AUTH_ENDPOINTS = ["/auth/refresh", "/auth/logout"];

type RequestOptions = RequestInit & { skipAutoRefresh?: boolean };

/**
 * Set the token expiration timestamp (current time + token lifetime)
 */
export function setTokenExpiration(): void {
  tokenExpiresAt = toUTC().valueOf() + TOKEN_LIFETIME_MS;
}

/**
 * Clear the token expiration timestamp
 */
export function clearTokenExpiration(): void {
  tokenExpiresAt = null;
}

function isAuthEndpointRequest(endpoint: string): boolean {
  return AUTH_ENDPOINTS.some((authEndpoint) =>
    endpoint.startsWith(authEndpoint)
  );
}

async function handlePreRequestRefresh(params: {
  endpoint: string;
  skipAutoRefresh?: boolean;
}): Promise<void> {
  const { endpoint, skipAutoRefresh } = params;
  if (isRefreshing && refreshPromise) {
    await refreshPromise;
    return;
  }

  if (
    skipAutoRefresh ||
    isAuthEndpointRequest(endpoint) ||
    !isTokenExpiringSoon()
  ) {
    return;
  }

  await attemptTokenRefresh();
}

function shouldAttachCSRFToken(method?: string): boolean {
  return Boolean(method && !["GET", "HEAD", "OPTIONS"].includes(method));
}

function buildRequestHeaders(params: {
  fetchOptions: RequestInit;
}): HeadersInit {
  const { fetchOptions } = params;
  const isFormData = fetchOptions.body instanceof FormData;
  const headers: HeadersInit = {
    // Don't set Content-Type for FormData, browser will set it with boundary
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...fetchOptions.headers,
  };

  if (shouldAttachCSRFToken(fetchOptions.method)) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }

  return headers;
}

function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get("content-type");
  return Boolean(contentType?.includes("application/json"));
}

async function parseErrorData(params: {
  response: Response;
  isJson: boolean;
}): Promise<AnyType> {
  const { response, isJson } = params;
  return isJson ? await response.json() : await response.text();
}

function getErrorMessage(errorData: AnyType): string {
  if (typeof errorData === "object" && errorData !== null) {
    return errorData.message || errorData.error || "Request failed";
  }
  return errorData || "Request failed";
}

async function throwApiErrorFromResponse(params: {
  response: Response;
  isJson: boolean;
}): Promise<never> {
  const { response, isJson } = params;
  const errorData = await parseErrorData({ response, isJson });
  const errorMessage = getErrorMessage(errorData);
  throw new ApiError(errorMessage, response.status, errorData);
}

async function parseSuccessResponse<T>(params: {
  response: Response;
  isJson: boolean;
}): Promise<T> {
  const { response, isJson } = params;
  if (response.status === 204) {
    return null as T;
  }

  if (isJson) {
    const result = await response.json();
    // Extract data from wrapped response format { data: T, status: number }
    return (result.data !== undefined ? result.data : result) as T;
  }

  return response.text() as Promise<T>;
}

async function handleUnauthorizedRetry<T>(params: {
  response: Response;
  isRetry: boolean;
  skipAutoRefresh?: boolean;
  endpoint: string;
  options: RequestOptions;
}): Promise<T | null> {
  const { response, isRetry, skipAutoRefresh, endpoint, options } = params;
  if (response.status !== 401 || isRetry || skipAutoRefresh) {
    return null;
  }

  if (isAuthEndpointRequest(endpoint)) {
    return null;
  }

  const refreshSuccessful = await attemptTokenRefresh();
  if (refreshSuccessful) {
    return request<T>(endpoint, options, true);
  }

  redirectToLogin();
  throw new ApiError("Session expired. Please log in again.", 401, {
    redirecting: true,
  });
}

/**
 * Check if the token is expiring soon (within refresh buffer window)
 * @returns true if token is null or expires within REFRESH_BUFFER_MS
 */
function isTokenExpiringSoon(): boolean {
  // If no expiration data, treat as expired (unknown state)
  if (tokenExpiresAt === null) {
    return true;
  }

  const timeUntilExpiration = tokenExpiresAt - toUTC().valueOf();
  return timeUntilExpiration < REFRESH_BUFFER_MS;
}

/**
 * Attempt to refresh the access token using the refresh token cookie
 * Returns true if refresh was successful, false otherwise
 */
async function attemptTokenRefresh(): Promise<boolean> {
  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const csrfToken = getCSRFToken();
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
      });

      if (response.ok) {
        // Update expiration timestamp after successful refresh
        setTokenExpiration();
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/** Marketing / unauthenticated routes — must not trigger 401 → /signin redirects. */
const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/signin",
  "/signup",
  "/how-it-works",
  "/our-story",
  "/pricing",
  "/careers",
  "/contact",
  "/terms",
  "/privacy",
  "/security",
  "/confidentiality",
  "/transparency",
  "/community-pledge",
  "/patent-package",
  "/verify-connection",
  "/auth/callback",
  "/auth/callback/google",
  "/auth/callback/microsoft",
  "/calendar/callback/google",
  "/calendar/callback/microsoft",
  "/auth/google-contacts/callback",
  "/auth/microsoft/callback",
  "/unsubscribe",
  "/maintenance",
]);

const PUBLIC_PATH_PREFIXES = [
  "/book-meeting",
  "/decline-introduction",
  "/request/",
  "/jobs/",
  "/accept-invite",
  "/consent/",
  "/unsubscribe",
  "/interview-booking",
  "/demo/meeting",
] as const;

function isPublicAppRoute(
  pathname: string = window.location.pathname
): boolean {
  if (PUBLIC_EXACT_PATHS.has(pathname)) {
    return true;
  }
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Redirect to login page and clear any stale auth state
 */
function redirectToLogin(): void {
  if (!isPublicAppRoute()) {
    // Preserve the requested URL so SignIn can forward it through the OAuth
    // round-trip (returnTo → /api/auth/google?returnTo → state → callback).
    // Without this, deep links (e.g. recruitment notification emails) lose
    // their context on every 401-driven bounce.
    const requested = window.location.pathname + window.location.search;
    const target =
      requested && requested !== "/" && !requested.startsWith("/signin")
        ? `/signin?returnTo=${encodeURIComponent(requested)}`
        : "/signin";
    // Use replace to prevent back button from going to protected page
    window.location.replace(target);
  }
}

/**
 * Make an authenticated API request with automatic token refresh
 * @param skipAutoRefresh - If true, skip automatic token refresh on 401 errors
 */
export async function request<T = AnyType>(
  endpoint: string,
  options: RequestOptions = {},
  isRetry: boolean = false
): Promise<T> {
  const { skipAutoRefresh, ...fetchOptions } = options;
  await handlePreRequestRefresh({ endpoint, skipAutoRefresh });

  const headers = buildRequestHeaders({ fetchOptions });
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: "include", // Include cookies in request
  });

  const isJson = isJsonResponse(response);
  const retryResult = await handleUnauthorizedRetry<T>({
    response,
    isRetry,
    skipAutoRefresh,
    endpoint,
    options,
  });
  if (retryResult !== null) {
    return retryResult;
  }

  // Handle 503 Service Unavailable / Maintenance Mode immediately
  if (response.status === 503) {
    if (
      typeof window !== "undefined" &&
      window.location.pathname !== "/maintenance"
    ) {
      window.location.href = "/maintenance";
    }
  }

  if (!response.ok) {
    await throwApiErrorFromResponse({ response, isJson });
  }

  return parseSuccessResponse<T>({ response, isJson });
}

/**
 * Helper function for React Query to use centralized API request
 * Handles both full URLs (/api/endpoint) and endpoints (/endpoint)
 * Automatically includes token refresh, CSRF tokens, and error handling
 *
 * @param queryKey - React Query's queryKey array (e.g., ["/api/endpoint", { param: value }])
 * @returns Promise with the API response data
 */
export async function apiRequestForQuery<T = AnyType>(
  queryKey: ReadonlyArray<unknown>
): Promise<T> {
  const url = queryKey[0] as string;

  if (!url || typeof url !== "string") {
    throw new ApiError(
      "Invalid queryKey: first element must be a string URL",
      400
    );
  }

  // Normalize URL: if it starts with /api, remove it (api.request adds it)
  // If it doesn't start with /api, use as-is (it's an endpoint)
  const endpoint = url.startsWith("/api") ? url.slice(4) : url;

  // Handle query parameters from queryKey
  // If queryKey[1] exists and is an object, convert to query string
  let fullEndpoint = endpoint;
  if (
    queryKey.length > 1 &&
    typeof queryKey[1] === "object" &&
    queryKey[1] !== null
  ) {
    const params = new URLSearchParams();
    Object.entries(queryKey[1] as Record<string, unknown>).forEach(
      ([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      }
    );
    const queryString = params.toString();
    if (queryString) {
      // Check if endpoint already has query params
      const separator = endpoint.includes("?") ? "&" : "?";
      fullEndpoint = `${endpoint}${separator}${queryString}`;
    }
  } else if (queryKey.length > 1 && typeof queryKey[1] === "string") {
    // Handle simple string parameters (like timeRange in URL format)
    // Check if endpoint already has query params
    const separator = endpoint.includes("?") ? "&" : "?";
    fullEndpoint = `${endpoint}${separator}${queryKey[1]}`;
  }

  // Use centralized request function which handles:
  // - Automatic token refresh on 401
  // - CSRF token injection (for non-GET requests)
  // - Error handling
  // - Response data extraction
  return request<T>(fullEndpoint);
}
