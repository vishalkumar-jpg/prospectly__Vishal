/** Floor for any retry delay. */
const MIN_DELAY_MS = 500;

/** Ceiling for any retry delay (30 s). */
const MAX_DELAY_MS = 30_000;

/** Clamp a delay value to [MIN_DELAY_MS, MAX_DELAY_MS], treating NaN as the floor. */
function clampDelay(ms: number): number {
  if (Number.isNaN(ms)) return MIN_DELAY_MS;
  if (ms === Number.POSITIVE_INFINITY) return MAX_DELAY_MS;
  if (ms === Number.NEGATIVE_INFINITY) return MIN_DELAY_MS;
  return Math.max(MIN_DELAY_MS, Math.min(Math.floor(ms), MAX_DELAY_MS));
}

function exponentialBackoffMs(attempt: number): number {
  return clampDelay(Math.pow(2, Math.max(0, attempt)) * 1000);
}

/** RFC 9110 Retry-After: delay-seconds or HTTP-date; fallback to exponential backoff. */
export function retryAfterDelayMs(
  headerValue: string | null,
  attempt: number
): number {
  const fallback = exponentialBackoffMs(attempt);
  if (headerValue === null || headerValue === undefined) {
    return fallback;
  }
  const value = headerValue.trim();
  if (!value) {
    return fallback;
  }
  if (/^\d+$/.test(value)) {
    return clampDelay(parseInt(value, 10) * 1000);
  }
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    const delay = parsed - Date.now();
    if (delay >= 0) {
      return clampDelay(delay);
    }
  }
  return fallback;
}

export function isTransientHttpResponse(response: Response): boolean {
  return response.status === 429 || response.status >= 500;
}

function isNodeTransientCode(code: unknown): boolean {
  return (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "EAI_AGAIN"
  );
}

export function isTransientFetchError(error: unknown): boolean {
  if (error === null || error === undefined) {
    return false;
  }
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return true;
    }
    if (error instanceof TypeError && error.message === "fetch failed") {
      return true;
    }
    const { cause } = error as Error & { cause?: unknown };
    if (
      cause &&
      typeof cause === "object" &&
      cause !== null &&
      "code" in cause
    ) {
      const { code } = cause as { code?: string };
      if (isNodeTransientCode(code)) {
        return true;
      }
    }
  }
  return false;
}

export function isTransientFailure(
  response: Response | null,
  error: unknown
): boolean {
  if (response !== null && !response.ok) {
    return isTransientHttpResponse(response);
  }
  return isTransientFetchError(error);
}
