import { ClassConstructor, plainToInstance } from "class-transformer";
import { appConfig } from "config/app.config";
import { awsS3Config } from "config/awsS3.config";

/** Normalizes skills from DB (array, JSON string, or unknown) to string[] for UI */
export function normalizeSkillsArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
    } catch {
      /* ignore invalid JSON */
    }
  }
  return [];
}

export const getQueryObject = (
  field: string,
  data?: string
): Record<string, string> | undefined => {
  try {
    if (!data) {
      return;
    }

    const trimmed = data.trim();
    const parsed = JSON.parse(trimmed);
    const obj = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      throw new Error("Expected a JSON object");
    }
    return obj as Record<string, string>;
  } catch (err) {
    throw new Error(`invalid JSON object at "${field}", ${err}`);
  }
};

export const transformToInstance = <T, V>(
  cls: ClassConstructor<T>,
  data: V
): T => {
  return plainToInstance(cls, data, {
    excludeExtraneousValues: true,
  });
};

function getImageBaseUrl(): string {
  const raw =
    appConfig.isProduction && awsS3Config.mediaProspectlyUrl
      ? awsS3Config.mediaProspectlyUrl
      : awsS3Config.cloudFrontUrl;
  return raw?.endsWith("/") ? raw.slice(0, -1) : (raw ?? "");
}

export const getImageUrl = (key: string): string => {
  const baseUrl = getImageBaseUrl();
  if (baseUrl && key.includes(baseUrl)) {
    return key;
  }
  if (awsS3Config.cloudFrontUrl && key.includes(awsS3Config.cloudFrontUrl)) {
    return key;
  }
  const path = key.startsWith("/") ? key.slice(1) : key;
  return baseUrl ? `${baseUrl}/${path}` : `${awsS3Config.cloudFrontUrl}${path}`;
};

export const removeImageUrl = (key: string): string => {
  const baseUrl = getImageBaseUrl();
  let sanitizedKey = key;
  if (baseUrl) {
    sanitizedKey = sanitizedKey.replace(baseUrl, "").trim();
  }
  if (awsS3Config.cloudFrontUrl) {
    sanitizedKey = sanitizedKey.replace(awsS3Config.cloudFrontUrl, "").trim();
  }
  if (!sanitizedKey.startsWith("/")) return sanitizedKey;
  return sanitizedKey.slice(1);
};

/** De-duplicates string array values by trimming, removing empties, and case-insensitive comparison */
export function mergeUniqueTrimmedStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const s = raw.trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}
