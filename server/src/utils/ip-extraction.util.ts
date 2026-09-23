import { Request } from "express";

/**
 * Extracts the client IP address from the request using Express APIs.
 * Requires Express proxy trust to be enabled (app.set('trust proxy', 1)).
 * Express safely handles X-Forwarded-For headers when trust proxy is enabled.
 *
 * @param request - Express request object
 * @returns The client IP address, or "unknown" if unable to determine
 */
export function getClientIp(request: Request): string {
  return (
    request.ips?.[0] || request.ip || request.socket?.remoteAddress || "unknown"
  );
}
