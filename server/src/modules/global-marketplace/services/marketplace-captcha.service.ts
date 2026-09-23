import { Injectable, BadRequestException } from "@nestjs/common";

/**
 * Result of reCAPTCHA verification.
 */
export interface CaptchaVerificationResult {
  success: boolean;
  score: number;
  action: string;
  errorCodes?: string[];
}

/**
 * Score thresholds for reCAPTCHA v3.
 */
export const CAPTCHA_THRESHOLDS = {
  /** Score below this is likely a bot */
  BOT: 0.3,
  /** Score below this is suspicious */
  SUSPICIOUS: 0.5,
  /** Score above this is likely human */
  HUMAN: 0.7,
};

/**
 * Service for verifying reCAPTCHA tokens.
 */
@Injectable()
export class MarketplaceCaptchaService {
  private readonly secretKey: string;
  private readonly verifyUrl =
    "https://www.google.com/recaptcha/api/siteverify";

  constructor() {
    this.secretKey = process.env.RECAPTCHA_SECRET_KEY || "";
  }

  /**
   * Verifies a reCAPTCHA v3 token.
   * @param token The token from the client
   * @param expectedAction The expected action name
   * @returns Verification result with score
   */
  async verifyToken(
    token: string,
    expectedAction: string
  ): Promise<CaptchaVerificationResult> {
    if (!this.secretKey) {
      // In development, allow requests without CAPTCHA
      if (process.env.NODE_ENV !== "production") {
        return { success: true, score: 1.0, action: expectedAction };
      }
      throw new BadRequestException("CAPTCHA service not configured");
    }

    try {
      const response = await fetch(this.verifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: this.secretKey,
          response: token,
        }),
      });

      const data = await response.json();

      const result: CaptchaVerificationResult = {
        success: data.success,
        score: data.score || 0,
        action: data.action || "",
        errorCodes: data["error-codes"],
      };

      // Verify action matches
      if (result.success && result.action !== expectedAction) {
        result.success = false;
        result.errorCodes = ["action-mismatch"];
      }

      return result;
    } catch {
      throw new BadRequestException("Failed to verify CAPTCHA");
    }
  }

  /**
   * Verifies token and throws if score is too low.
   * @param token The token from the client
   * @param expectedAction The expected action name
   * @param minScore Minimum acceptable score (default: SUSPICIOUS threshold)
   */
  async verifyOrThrow(
    token: string,
    expectedAction: string,
    minScore = CAPTCHA_THRESHOLDS.SUSPICIOUS
  ): Promise<CaptchaVerificationResult> {
    const result = await this.verifyToken(token, expectedAction);

    if (!result.success) {
      throw new BadRequestException("CAPTCHA verification failed");
    }

    if (result.score < CAPTCHA_THRESHOLDS.BOT) {
      throw new BadRequestException("Request blocked for security reasons");
    }

    if (result.score < minScore) {
      throw new BadRequestException("Please complete additional verification");
    }

    return result;
  }

  /**
   * Checks if a score indicates suspicious activity.
   */
  isSuspicious(score: number): boolean {
    return score < CAPTCHA_THRESHOLDS.SUSPICIOUS;
  }

  /**
   * Checks if a score indicates bot activity.
   */
  isBot(score: number): boolean {
    return score < CAPTCHA_THRESHOLDS.BOT;
  }
}
