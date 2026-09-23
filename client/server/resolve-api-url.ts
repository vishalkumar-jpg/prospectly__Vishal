/**
 * SSR-only API base URL. Mirrors client `import.meta.env.VITE_API_URL ?? "/api"`,
 * but Node fetch requires an absolute URL when the client would use `/api`.
 *
 * Prefer `SSR_API_URL` in Docker/production so browser `/api` and internal
 * backend URLs can differ (e.g. http://prospectly:5001/api on the compose network).
 */
export function getSsrApiBaseUrl(): string {
  const ssrRaw = process.env.SSR_API_URL?.trim();
  if (ssrRaw) {
    return ssrRaw.replace(/\/$/, "");
  }

  const raw = process.env.VITE_API_URL?.trim();
  if (!raw) {
    return "http://127.0.0.1:5001/api";
  }

  if (raw.startsWith("/")) {
    const port = process.env.PORT || "3000";
    return `http://127.0.0.1:${port}${raw}`;
  }

  return raw.replace(/\/$/, "");
}
