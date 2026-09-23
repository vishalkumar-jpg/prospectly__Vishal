import { getOsEnv, getOsEnvOptional } from "./env.config";

export const apolloConfig = {
  apiKey: getOsEnv("APOLLO_API_KEY"),
  baseUrl: getOsEnvOptional("APOLLO_BASE_URL") || "https://api.apollo.io",
  timeoutMs: parseInt(getOsEnvOptional("APOLLO_TIMEOUT_MS") || "15000", 10),
};
