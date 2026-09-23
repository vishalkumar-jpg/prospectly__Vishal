import { Injectable, Logger, Inject, Optional } from "@nestjs/common";
import { MarketplaceClaimAuthService } from "modules/global-marketplace/services/marketplace-claim-auth.service";
import { appConfig } from "config/app.config";

@Injectable()
export class AuthClaimFlowService {
  private readonly logger = new Logger(AuthClaimFlowService.name);

  constructor(
    @Optional()
    @Inject(MarketplaceClaimAuthService)
    private readonly claimAuthService: MarketplaceClaimAuthService | null
  ) {}

  /**
   * Check if this is a claim flow and determine the appropriate redirect
   * For existing users: skip claim, redirect to dashboard (silent)
   * For new users: allow claim flow to continue
   */
  async checkClaimFlowEligibility(
    email: string,
    returnTo: string | null
  ): Promise<{ isClaimFlow: boolean; skipClaimRedirect: string | null }> {
    if (!this.claimAuthService) {
      return { isClaimFlow: false, skipClaimRedirect: null };
    }

    const claimParams = this.claimAuthService.parseClaimFlowParams(returnTo);
    if (!claimParams) {
      return { isClaimFlow: false, skipClaimRedirect: null }; // Not a claim flow
    }

    const isNewUser =
      await this.claimAuthService.isNewUserEligibleForClaim(email);
    if (isNewUser) {
      return { isClaimFlow: true, skipClaimRedirect: null }; // New user, proceed with claim
    }

    // Existing user - silently redirect to getting-started (no error)
    return {
      isClaimFlow: true,
      skipClaimRedirect: `${appConfig.frontendUrl}/getting-started`,
    };
  }

  /**
   * Create claim for new user after successful registration
   * Called only for new users in claim flow
   */
  async createClaimForNewUser(
    userId: string,
    returnTo: string | null
  ): Promise<void> {
    if (!this.claimAuthService) return;

    const claimParams = this.claimAuthService.parseClaimFlowParams(returnTo);
    if (!claimParams) return;

    const result = await this.claimAuthService.startClaimForNewUser(
      userId,
      claimParams
    );

    if (!result.allowed) {
      this.logger.warn(
        `Claim creation failed for user ${userId}: ${result.errorCode} - ${result.errorMessage}`
      );
    } else {
      this.logger.log(`Claim ${result.claimId} created for new user ${userId}`);
    }
  }
}
