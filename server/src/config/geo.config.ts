import { getOsEnvOptional } from "./env.config";

const DEFAULT_TIMEOUT_MS = 3000;

/** Falls back to the default when the env value is missing or not a number. */
const parseTimeoutMs = (raw?: string) => {
  const parsed = Number(raw);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
};

/**
 * IP geolocation lookup (IPinfo Lite).
 */
export const geoConfig = {
  ipinfoToken: getOsEnvOptional("IPINFO_TOKEN") || "",
  baseUrl: getOsEnvOptional("IPINFO_BASE_URL") || "https://api.ipinfo.io",
  timeoutMs: parseTimeoutMs(getOsEnvOptional("IPINFO_TIMEOUT_MS")),
};
