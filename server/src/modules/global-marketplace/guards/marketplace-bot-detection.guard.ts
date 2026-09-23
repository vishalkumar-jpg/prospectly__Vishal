import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from "@nestjs/common";
import { Request } from "express";

/**
 * Suspicious patterns that indicate bot behavior.
 */
const SUSPICIOUS_USER_AGENTS = [
  "bot",
  "crawler",
  "spider",
  "scraper",
  "curl",
  "wget",
  "python-requests",
  "httpx",
  "axios",
  "node-fetch",
  "phantom",
  "headless",
];

/**
 * Guard for detecting and blocking bot requests.
 * Checks for:
 * - Honeypot field (must be empty)
 * - Suspicious user agents
 * - Missing required headers
 * - Request timing (too fast submissions)
 */
@Injectable()
export class MarketplaceBotDetectionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Check honeypot field
    if (!this.validateHoneypot(request)) {
      throw new BadRequestException("Invalid request");
    }

    // Check user agent
    if (!this.validateUserAgent(request)) {
      throw new BadRequestException("Invalid request");
    }

    // Check required headers
    if (!this.validateHeaders(request)) {
      throw new BadRequestException("Invalid request");
    }

    // Check request timing metadata
    if (!this.validateTiming(request)) {
      throw new BadRequestException("Please slow down and try again");
    }

    return true;
  }

  /**
   * Validates honeypot field is empty.
   */
  private validateHoneypot(request: Request): boolean {
    const honeypotFields = ["website_url", "hp_field", "confirm_email_hp"];

    for (const field of honeypotFields) {
      const value = request.body?.[field] || request.query?.[field];
      if (value && value !== "") {
        // Bot detected - honeypot was filled
        return false;
      }
    }

    return true;
  }

  /**
   * Validates user agent is not suspicious.
   */
  private validateUserAgent(request: Request): boolean {
    const userAgent = (request.headers["user-agent"] || "").toLowerCase();

    // Missing user agent is suspicious
    if (!userAgent) {
      return false;
    }

    // Check for suspicious patterns
    for (const pattern of SUSPICIOUS_USER_AGENTS) {
      if (userAgent.includes(pattern)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validates required headers are present.
   */
  private validateHeaders(request: Request): boolean {
    // Accept header should be present for legitimate browser requests
    const accept = request.headers["accept"];
    if (!accept) {
      return false;
    }

    // Origin/Referer should be present for POST requests
    if (request.method === "POST") {
      const origin = request.headers["origin"];
      const referer = request.headers["referer"];
      if (!origin && !referer) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validates request timing metadata.
   * Bots often submit forms instantly without any delay.
   */
  private validateTiming(request: Request): boolean {
    // Check if timing metadata was provided
    const formLoadTime = request.body?._formLoadTime;
    const submitTime = request.body?._submitTime;

    if (formLoadTime && submitTime) {
      const duration = submitTime - formLoadTime;

      // If form was submitted in less than 2 seconds, likely a bot
      if (duration < 2000) {
        return false;
      }
    }

    return true;
  }
}
