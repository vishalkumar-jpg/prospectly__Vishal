import { BadRequestException } from "@nestjs/common";
import dns from "node:dns/promises";
import { fetchJobPageWithPinnedIp } from "../job-extraction-pinned-fetch.utils";
import {
  assertLiteralHostnameAllowed,
  parseAndAssertJobExtractionUrl,
} from "../hostname-assert";
import { isNonPublicInetAddress, stripIpv6Brackets } from "../ip-utils";

/** Max HTTP redirects while fetching a job page (each hop re-validated). */
export const MAX_JOB_EXTRACTION_REDIRECTS = 10;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Resolve hostname via DNS, validate every returned address is public,
 * and return the first validated address so callers can pin connections to it.
 */
export async function resolveAndValidatePublicAddress(
  hostname: string
): Promise<string> {
  assertLiteralHostnameAllowed(hostname);

  let records: { address: string; family: number }[];
  try {
    records = await dns.lookup(hostname, { all: true });
  } catch {
    throw new BadRequestException(
      "Could not resolve this host. Check the URL and try again."
    );
  }

  if (!records.length) {
    throw new BadRequestException(
      "Could not resolve this host. Check the URL and try again."
    );
  }

  for (const { address, family } of records) {
    if (family !== 4 && family !== 6) continue;
    if (isNonPublicInetAddress(address, family)) {
      throw new BadRequestException("This URL is not allowed.");
    }
  }

  return records[0].address;
}

/**
 * Build a URL with IP address as host for pinned connections.
 */
export function buildIpPinnedUrl(originalUrl: URL, resolvedIp: string): URL {
  const pinnedUrl = new URL(originalUrl.toString());
  pinnedUrl.hostname = resolvedIp;
  return pinnedUrl;
}

/**
 * Fetch with redirect: manual. DNS is resolved once per hop by
 * resolveAndValidatePublicAddress, then the request is pinned to the
 * validated IP so the client cannot resolve a different (private) address.
 * HTTPS uses node TLS `servername` (SNI) for the original host — required by
 * many CDNs when the TCP target is an IP.
 */
export async function fetchJobPageWithSsrfGuards(
  initialUrl: URL,
  init: RequestInit,
  maxRedirects = MAX_JOB_EXTRACTION_REDIRECTS
): Promise<Response> {
  let current = new URL(initialUrl.toString());

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const resolvedIp = await resolveAndValidatePublicAddress(
      stripIpv6Brackets(current.hostname)
    );

    // Merge caller headers with the Host header so the origin server
    // receives the original hostname (required for virtual hosts).
    const originalHost = current.host; // includes port if non-default
    const mergedHeaders = new Headers(init.headers);
    mergedHeaders.set("Host", originalHost);

    const hopTimeout = new AbortController();
    const timeoutId = setTimeout(() => hopTimeout.abort(), 30000);
    const mergedSignal =
      init.signal != null
        ? AbortSignal.any([hopTimeout.signal, init.signal])
        : hopTimeout.signal;

    const tlsServerName = stripIpv6Brackets(current.hostname);
    let res: Response;
    try {
      res = await fetchJobPageWithPinnedIp(
        current,
        resolvedIp,
        tlsServerName,
        mergedHeaders,
        mergedSignal,
        init.method ?? "GET"
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (REDIRECT_STATUSES.has(res.status)) {
      const loc = res.headers.get("Location");
      if (!loc) {
        throw new BadRequestException(
          "Could not load this URL (invalid redirect)."
        );
      }
      if (hop >= maxRedirects) {
        throw new BadRequestException(
          "Could not load this URL (too many redirects)."
        );
      }

      await res.body?.cancel().catch(() => undefined);

      let next: URL;
      try {
        next = new URL(loc, current);
      } catch {
        throw new BadRequestException(
          "Could not load this URL (invalid redirect)."
        );
      }
      current = parseAndAssertJobExtractionUrl(next.href);
      continue;
    }

    return res;
  }

  throw new BadRequestException(
    "Could not load this URL (too many redirects)."
  );
}
