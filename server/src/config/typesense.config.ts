import { getOsEnv, getOsEnvOptional } from "./env.config";

export const typesenseConfig = {
  host: getOsEnv("TYPESENSE_HOST"),
  port: parseInt(getOsEnvOptional("TYPESENSE_PORT") || "443", 10),
  protocol: getOsEnvOptional("TYPESENSE_PROTOCOL") || "https",
  apiKey: getOsEnv("TYPESENSE_API_KEY"),
  connectionTimeoutSeconds: parseInt(
    getOsEnvOptional("TYPESENSE_CONNECTION_TIMEOUT") || "10",
    10
  ),
};
