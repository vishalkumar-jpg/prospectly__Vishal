/** TanStack Query keys for GET /contacts/import-accounts?provider=… */
export const GOOGLE_IMPORT_ACCOUNTS_QUERY_KEY = [
  "contacts",
  "import-accounts",
  "google",
] as const;

export const MICROSOFT_IMPORT_ACCOUNTS_QUERY_KEY = [
  "contacts",
  "import-accounts",
  "microsoft",
] as const;

export const APPLE_IMPORT_ACCOUNTS_QUERY_KEY = [
  "contacts",
  "import-accounts",
  "apple",
] as const;

/** Shared staleTime so modal + Getting Started card dedupe network requests. */
export const GOOGLE_IMPORT_ACCOUNTS_STALE_MS = 45_000;

/** Invalidate all provider-specific import-accounts lists (Getting Started cards). */
export const ALL_IMPORT_ACCOUNTS_QUERY_KEYS = [
  GOOGLE_IMPORT_ACCOUNTS_QUERY_KEY,
  MICROSOFT_IMPORT_ACCOUNTS_QUERY_KEY,
  APPLE_IMPORT_ACCOUNTS_QUERY_KEY,
] as const;
