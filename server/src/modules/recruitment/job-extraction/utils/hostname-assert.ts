import { BadRequestException } from "@nestjs/common";
import net from "node:net";
import {
  isNonPublicIpv4,
  isNonPublicIpv6,
  stripIpv6Brackets,
} from "./ip-utils";

export function assertLiteralHostnameAllowed(hostname: string): void {
  const host = stripIpv6Brackets(hostname.toLowerCase());
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "::"
  ) {
    throw new BadRequestException("This URL is not allowed.");
  }
  if (host.startsWith("127.")) {
    throw new BadRequestException("This URL is not allowed.");
  }

  if (net.isIPv4(host) && isNonPublicIpv4(host)) {
    throw new BadRequestException("This URL is not allowed.");
  }
  if (net.isIPv6(host) && isNonPublicIpv6(host)) {
    throw new BadRequestException("This URL is not allowed.");
  }

  const privateOctet =
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host);
  if (privateOctet) {
    throw new BadRequestException("This URL is not allowed.");
  }
}

/**
 * Parse user URL and apply protocol / host-string SSRF policy (no DNS).
 */
export function parseAndAssertJobExtractionUrl(urlString: string): URL {
  let u: URL;
  try {
    u = new URL(urlString.trim());
  } catch {
    throw new BadRequestException("Invalid URL.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new BadRequestException("Only http(s) URLs are allowed.");
  }
  if (u.username !== "" || u.password !== "") {
    throw new BadRequestException("URLs with credentials are not allowed.");
  }
  assertLiteralHostnameAllowed(u.hostname);
  return u;
}
