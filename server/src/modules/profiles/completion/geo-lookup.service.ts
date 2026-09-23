import { Injectable, Logger } from "@nestjs/common";
import { geoConfig } from "config/geo.config";

/** IPinfo Lite response — we only read the country code. */
interface IpinfoLiteResponse {
  country_code?: string;
}

/**
 * Resolves an ISO 3166-1 alpha-2 country code from a client IP address.
 *
 * This service never throws: a failed lookup is not a user-facing error, it
 * just means there is no suggestion to offer, and the gate falls back to an
 * empty, required dropdown. Every failure path returns `null`.
 */
@Injectable()
export class GeoLookupService {
  private readonly logger = new Logger(GeoLookupService.name);

  /**
   * @param ip - Client IP from `getClientIp()`, which returns "unknown" when undeterminable.
   * @returns Uppercase ISO alpha-2 country code, or `null` if it cannot be resolved.
   */
  async lookupCountry(ip: string): Promise<string | null> {
    if (!this.isPublicIp(ip)) {
      return null;
    }

    if (!geoConfig.ipinfoToken) {
      this.logger.warn(
        "GEO_LOOKUP_SERVICE :: LOOKUP_COUNTRY : IPINFO_TOKEN is not configured, skipping lookup"
      );
      return null;
    }

    const url = `${geoConfig.baseUrl}/lite/${encodeURIComponent(ip)}?token=${encodeURIComponent(geoConfig.ipinfoToken)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), geoConfig.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        this.logger.warn(
          `GEO_LOOKUP_SERVICE :: LOOKUP_COUNTRY : ERROR : ipinfo ${response.status}: ${text.substring(0, 200)}`
        );
        return null;
      }

      const body = (await response.json()) as IpinfoLiteResponse;
      const countryCode = body?.country_code?.trim().toUpperCase();

      // Anything that isn't exactly two letters is unusable downstream.
      return countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : null;
    } catch (error) {
      const reason =
        error instanceof Error && error.name === "AbortError"
          ? `request timed out after ${geoConfig.timeoutMs}ms`
          : error;
      this.logger.warn(
        `GEO_LOOKUP_SERVICE :: LOOKUP_COUNTRY : ERROR : ${reason}`
      );
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Loopback and RFC1918 addresses can never be geolocated, so we short-circuit
   * before spending a network call. This is what keeps local dev quiet.
   */
  private isPublicIp(ip: string): boolean {
    if (!ip || ip === "unknown") {
      return false;
    }

    // Express may hand back IPv4-mapped IPv6 (e.g. "::ffff:127.0.0.1").
    const normalized = ip.startsWith("::ffff:") ? ip.slice(7) : ip;

    if (normalized === "::1" || normalized === "0.0.0.0") {
      return false;
    }

    // Unique local IPv6 (fc00::/7) and IPv6 link-local (fe80::/10).
    const lowered = normalized.toLowerCase();
    if (/^f[cd][0-9a-f]{2}:/.test(lowered) || lowered.startsWith("fe80:")) {
      return false;
    }

    const octets = normalized.split(".");
    if (octets.length !== 4) {
      // Any other IPv6 address is treated as public.
      return normalized.includes(":");
    }

    const [first, second] = octets.map((part) => Number(part));
    if (!Number.isInteger(first) || !Number.isInteger(second)) {
      return false;
    }

    if (first === 10 || first === 127) return false;
    if (first === 192 && second === 168) return false;
    if (first === 172 && second >= 16 && second <= 31) return false;
    if (first === 169 && second === 254) return false;

    return true;
  }
}
