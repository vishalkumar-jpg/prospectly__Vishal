import { Logger } from "@nestjs/common";
import {
  EMAIL_CONFIG,
  EMAIL_RETRY_PATTERNS,
  EMAILS_MESSAGES,
} from "./emails.constants";

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function isRetryableError(error: unknown): boolean {
  const err = error as { message?: string };
  const message = err?.message?.toLowerCase() || "";
  return EMAIL_RETRY_PATTERNS.some((pattern) => message.includes(pattern));
}

export async function sendWithRetry<T>(
  operation: () => Promise<T>,
  context: string,
  logger: Logger
): Promise<T> {
  if (EMAIL_CONFIG.MAX_RETRIES <= 0) {
    throw new Error("Invalid EMAIL_CONFIG.MAX_RETRIES");
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= EMAIL_CONFIG.MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;

      if (!isRetryableError(error) || attempt === EMAIL_CONFIG.MAX_RETRIES) {
        throw error;
      }

      const delayMs = EMAIL_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      const err = error as { message?: string };

      logger.warn(
        EMAILS_MESSAGES.WARN.RETRYING(
          context,
          attempt,
          EMAIL_CONFIG.MAX_RETRIES,
          err?.message || "Unknown error",
          delayMs
        )
      );
      await delay(delayMs);
    }
  }

  throw lastError;
}
