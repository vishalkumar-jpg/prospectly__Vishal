import net from "node:net";

export function isNonPublicIpv4(ip: string): boolean {
  if (!net.isIPv4(ip)) return false;
  const parts = ip.split(".").map((x) => parseInt(x, 10));
  if (parts.length !== 4 || parts.some((n) => n < 0 || n > 255)) return true;
  const [a, b, c] = parts;

  if (a === 0 || a === 127 || a >= 224) return true;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;

  return false;
}

export function isNonPublicIpv6(ip: string): boolean {
  const z = ip.toLowerCase();
  if (z === "::1" || z === "::") return true;

  if (z.startsWith("::ffff:")) {
    const tail = z.slice(7);
    if (net.isIPv4(tail)) return isNonPublicIpv4(tail);

    // Handle hex-form IPv4-mapped tails (e.g., "::ffff:7f00:1")
    const hexMatch = tail.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
    if (hexMatch) {
      const val1 = parseInt(hexMatch[1], 16);
      const val2 = parseInt(hexMatch[2], 16);

      // Convert 16-bit values to 4 octets (big-endian)
      const octet1 = (val1 >> 8) & 0xff;
      const octet2 = val1 & 0xff;
      const octet3 = (val2 >> 8) & 0xff;
      const octet4 = val2 & 0xff;

      const convertedIp = `${octet1}.${octet2}.${octet3}.${octet4}`;
      return isNonPublicIpv4(convertedIp);
    }
  }

  // fe80::/10 link-local — first 16-bit group ranges from 0xfe80 to 0xfebf.
  const head = z.split(":").find((h) => h.length > 0);
  if (head) {
    const headVal = parseInt(head, 16);
    if (Number.isFinite(headVal) && headVal >= 0xfe80 && headVal <= 0xfebf)
      return true;
    // fc00::/7 unique-local
    if (head.startsWith("fc") || head.startsWith("fd")) return true;
  }

  if (z.startsWith("ff")) return true;
  if (z.includes("2001:db8:") || z.includes("2001:0db8:")) return true;

  return false;
}

export function isNonPublicInetAddress(
  address: string,
  family: 4 | 6
): boolean {
  if (family === 4) return isNonPublicIpv4(address);
  return isNonPublicIpv6(address);
}

/**
 * Strip surrounding brackets from IPv6 literals.
 * URL.hostname returns "[::1]" for http://[::1]/ — net.isIPv6() needs the bare address.
 */
export function stripIpv6Brackets(hostname: string): string {
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return hostname.slice(1, -1);
  }
  return hostname;
}
