import { Injectable, Logger, Inject } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { eq, and } from "drizzle-orm";
import { ProfilesService } from "modules/profiles/profiles.service";

export interface ClaimFlowParams {
  requestId: string;
  sharerCode: string;
}

export interface ClaimFlowResult {
  allowed: boolean;
  claimId?: string;
  errorCode?:
    | "existing_user"
    | "already_claimed"
    | "invalid_request"
    | "one_deal_limit";
  errorMessage?: string;
  redirectParams?: { requestId: string; sharerCode: string };
}

@Injectable()
export class MarketplaceClaimAuthService {
  private readonly logger = new Logger(MarketplaceClaimAuthService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly profilesService: ProfilesService
  ) {}

  /**
   * Parse claim params from returnTo URL
   * Returns null if not a claim flow
   */
  parseClaimFlowParams(returnTo: string | null): ClaimFlowParams | null {
    if (!returnTo) return null;
    if (!returnTo.includes("/verify-connection")) return null;

    try {
      const queryStart = returnTo.indexOf("?");
      if (queryStart === -1) return null;

      const params = new URLSearchParams(returnTo.substring(queryStart + 1));
      const requestId = params.get("requestId");
      const sharerCode = params.get("sharerCode");

      if (!requestId || !sharerCode) return null;

      return { requestId, sharerCode };
    } catch {
      return null;
    }
  }

  /**
   * Check if existing user is allowed to claim (they're not - must be new)
   * Returns true if user is NEW (allowed to claim), false if existing
   */
  async isNewUserEligibleForClaim(email: string): Promise<boolean> {
    const existingUser = await this.profilesService.getProfileByEmail(email);
    return existingUser === null || existingUser === undefined;
  }

  /**
   * Start claim for a new user during OAuth callback
   * Called AFTER user is created successfully
   */
  async startClaimForNewUser(
    userId: string,
    params: ClaimFlowParams
  ): Promise<ClaimFlowResult> {
    const { requestId, sharerCode } = params;

    try {
      // 1. Check one-deal-per-person limit
      const [existingClaim] = await this.db
        .select()
        .from(schema.marketplaceClaims)
        .where(eq(schema.marketplaceClaims.claimerId, userId))
        .limit(1);

      if (existingClaim) {
        return {
          allowed: false,
          errorCode: "one_deal_limit",
          errorMessage: "You can only claim one marketplace deal",
          redirectParams: { requestId, sharerCode },
        };
      }

      // 2. Validate share code exists
      const [share] = await this.db
        .select()
        .from(schema.marketplaceShares)
        .where(eq(schema.marketplaceShares.sharerCode, sharerCode))
        .limit(1);

      if (!share) {
        return {
          allowed: false,
          errorCode: "invalid_request",
          errorMessage: "Invalid share link",
          redirectParams: { requestId, sharerCode },
        };
      }

      // 3. Validate introduction request exists and is claimable
      const [introRequest] = await this.db
        .select()
        .from(schema.introductionRequests)
        .where(
          and(
            eq(schema.introductionRequests.id, requestId),
            eq(schema.introductionRequests.isMarketplaceVisible, true)
          )
        )
        .limit(1);

      if (!introRequest) {
        return {
          allowed: false,
          errorCode: "invalid_request",
          errorMessage: "This opportunity is no longer available",
          redirectParams: { requestId, sharerCode },
        };
      }

      // 4. Check if already claimed by someone else
      const [completedClaim] = await this.db
        .select()
        .from(schema.marketplaceClaims)
        .where(
          and(
            eq(schema.marketplaceClaims.introductionRequestId, requestId),
            eq(schema.marketplaceClaims.status, "completed")
          )
        )
        .limit(1);

      if (completedClaim) {
        return {
          allowed: false,
          errorCode: "already_claimed",
          errorMessage: "This opportunity has already been claimed",
          redirectParams: { requestId, sharerCode },
        };
      }

      // 5. Create the claim
      const [claim] = await this.db
        .insert(schema.marketplaceClaims)
        .values({
          introductionRequestId: requestId,
          claimerId: userId,
          sharerCode,
          sharerId: share.sharerId,
          status: "pending",
          sourcesChecked: [],
        })
        .returning();

      this.logger.log(
        `Created marketplace claim ${claim.id} for new user ${userId}`
      );

      return {
        allowed: true,
        claimId: claim.id,
      };
    } catch (error) {
      this.logger.error(`Failed to create claim for user ${userId}: ${error}`);
      return {
        allowed: false,
        errorCode: "invalid_request",
        errorMessage: "Failed to start claim process",
        redirectParams: { requestId, sharerCode },
      };
    }
  }
}
