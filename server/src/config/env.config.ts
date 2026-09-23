import { config } from "dotenv";

config();

export function getOsEnv(key: string) {
  return process.env[key] ?? "";
}

export function getOsEnvOptional(key: string): string | undefined {
  return process.env[key];
}
