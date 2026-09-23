import { Injectable, Inject, Logger } from "@nestjs/common";
import { ProfilesService } from "modules/profiles/profiles.service";
import { AnyType } from "types/common";
import { StripePayoutsService } from "./stripe-payouts.service";

/**
 * Shared payout-onboarding helpers used by the status / account / account-link
 * services: persisting onboarding completion and detecting whether a recipient
 * account has already finished the Stripe-hosted onboarding form.
 */
@Injectable()
export class StripeOnboardingService {
  private readonly logger = new Logger(StripeOnboardingService.name);

  constructor(
    @Inject(ProfilesService)
    private readonly profilesService: ProfilesService,
    @Inject(StripePayoutsService)
    private readonly stripePayoutsService: StripePayoutsService
  ) {}

  /**
   * Persists onboarding completion + the resolved payout method id so the app
   * recognizes a connected account even if the v2 webhook never fired.
   * `fetchMethodForAccountId` (when non-null) triggers a lookup of the default
   * payout method because we don't have it from the account response yet.
   */
  async reconcileOnboarding(
    userId: string,
    profile: {
      stripeRecipientOnboardingComplete?: boolean | null;
      stripePayoutMethodId?: string | null;
    },
    onboardingComplete: boolean,
    payoutMethodId: string | null,
    fetchMethodForAccountId: string | null
  ): Promise<void> {
    let resolvedMethodId = payoutMethodId;
    if (!resolvedMethodId && fetchMethodForAccountId) {
      try {
        resolvedMethodId =
          await this.stripePayoutsService.getDefaultPayoutMethodId(
            fetchMethodForAccountId
          );
      } catch (error) {
        this.logger.warn(
          `STRIPE_ONBOARDING_SERVICE :: reconcileOnboarding : payout method lookup failed : ${error}`
        );
      }
    }

    const update: Record<string, unknown> = {};
    if (onboardingComplete && !profile.stripeRecipientOnboardingComplete) {
      update.stripeRecipientOnboardingComplete = true;
    }
    if (resolvedMethodId && resolvedMethodId !== profile.stripePayoutMethodId) {
      update.stripePayoutMethodId = resolvedMethodId;
    }
    if (Object.keys(update).length > 0) {
      await this.profilesService.updateProfile(userId, update as AnyType);
    }
  }

  /**
   * Resolves whether a recipient account has finished onboarding. Prefers the
   * live capability status; falls back to the persisted flag if the v2 read
   * fails so we never re-trigger an onboarding link for a completed account.
   */
  async isAlreadyOnboarded(
    accountId: string,
    storedComplete: boolean
  ): Promise<boolean> {
    try {
      const account =
        await this.stripePayoutsService.getRecipientAccount(accountId);
      const state =
        this.stripePayoutsService.getRecipientOnboardingState(account);
      if (state.onboarded || state.payoutMethodId) {
        return true;
      }
      // Authoritative: a recipient with a payout method has finished onboarding.
      const methods =
        await this.stripePayoutsService.listPayoutMethods(accountId);
      return methods.length > 0;
    } catch (error) {
      this.logger.warn(
        `STRIPE_ONBOARDING_SERVICE :: isAlreadyOnboarded : fetch failed, using stored flag : ${error}`
      );
      return storedComplete;
    }
  }
}
