import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

/**
 * Rate limit configuration for different marketplace endpoints.
 */
export interface MarketplaceRateLimitConfig {
  /** Requests allowed per window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Identifier type for rate limiting */
  identifierType: "ip" | "user" | "fingerprint";
}

/**
 * Decorator key for rate limit metadata.
 */
export const MARKETPLACE_RATE_LIMIT_KEY = "marketplace_rate_limit";

/**
 * Decorator to apply rate limiting to marketplace endpoints.
 */
export function MarketplaceRateLimit(config: MarketplaceRateLimitConfig) {
  return (target: object, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(
      MARKETPLACE_RATE_LIMIT_KEY,
      config,
      descriptor?.value ?? target
    );
  };
}

/**
 * In-memory rate limit store (replace with Redis in production).
 * Format: { identifier: { count: number, resetTime: number } }
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Guard for rate limiting marketplace endpoints.
 * Uses configurable limits per endpoint.
 */
@Injectable()
export class MarketplaceRateLimitGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();

    // Get rate limit config from decorator
    const config = this.reflector.get<MarketplaceRateLimitConfig>(
      MARKETPLACE_RATE_LIMIT_KEY,
      handler
    );

    if (!config) {
      // No rate limit configured, allow request
      return true;
    }

    const identifier = this.getIdentifier(request, config.identifierType);
    const key = `${handler.name}:${identifier}`;

    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      // New window or expired, reset counter
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowSeconds * 1000,
      });
      return true;
    }

    if (entry.count >= config.limit) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Too many requests. Please try again later.",
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Increment counter
    entry.count++;
    return true;
  }

  private getIdentifier(
    request: Request,
    type: MarketplaceRateLimitConfig["identifierType"]
  ): string {
    switch (type) {
      case "user":
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (request as any).user?.userId || this.getClientIp(request);
      case "fingerprint":
        return (
          (request.headers["x-fingerprint"] as string) ||
          this.getClientIp(request)
        );
      case "ip":
      default:
        return this.getClientIp(request);
    }
  }

  private getClientIp(request: Request): string {
    return (
      request.ips?.[0] ||
      request.ip ||
      request.socket?.remoteAddress ||
      "unknown"
    );
  }
}

/**
 * Default rate limits for marketplace endpoints.
 */
export const MARKETPLACE_RATE_LIMITS = {
  PUBLIC_REQUEST_VIEW: {
    limit: 100,
    windowSeconds: 60,
    identifierType: "ip",
  } as const,
  CLAIM_START: { limit: 5, windowSeconds: 60, identifierType: "ip" } as const,
  TRACK_EVENT: { limit: 60, windowSeconds: 60, identifierType: "ip" } as const,
  SHARE_CREATE: {
    limit: 20,
    windowSeconds: 60,
    identifierType: "user",
  } as const,
  BROWSE: { limit: 30, windowSeconds: 60, identifierType: "user" } as const,
} satisfies Record<string, MarketplaceRateLimitConfig>;
