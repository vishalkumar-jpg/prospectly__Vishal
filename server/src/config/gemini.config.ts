import { getOsEnvOptional } from "./env.config";

const DEFAULT_GEMINI_MAX_TOKENS = 1024;

function safeGeminiMaxTokens(raw: string | undefined): number {
  if (!raw || !/^\d+$/.test(raw)) return DEFAULT_GEMINI_MAX_TOKENS;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_GEMINI_MAX_TOKENS;
}

export const geminiConfig = {
  apiKey: getOsEnvOptional("GEMINI_API_KEY") || "",
  apiUrl: getOsEnvOptional("GEMINI_API_URL"),
  batchSize: parseInt(getOsEnvOptional("GEMINI_BATCH_SIZE") || "20", 10),
  maxTokens: safeGeminiMaxTokens(getOsEnvOptional("GEMINI_MAX_TOKENS")),
  enabled: !!getOsEnvOptional("GEMINI_API_KEY"),
  bountyCalculationEnabled:
    getOsEnvOptional("ENABLE_GEMINI_BOUNTY_CALCULATION") === "true",
};
