import { Injectable, Inject } from "@nestjs/common";
import { ProfilesService } from "modules/profiles/profiles.service";
import { StripePayoutsService } from "./stripe-payouts.service";
import { StripeOnboardingService } from "./stripe-onboarding.service";
import { resolvePayoutOnboardingUrls } from "../payout-onboarding.helpers";

/**
 * Refreshes/regenerates a Stripe-hosted onboarding link for an existing recipient
 * account that hasn't finished onboarding — `GET /stripe/payouts/account-link`.
 */
@Injectable()
export class StripeAccountLinkService {
  constructor(
    @Inject(ProfilesService)
    private readonly profilesService: ProfilesService,
    @Inject(StripePayoutsService)
    private readonly stripePayoutsService: StripePayoutsService,
    @Inject(StripeOnboardingService)
    private readonly onboardingService: StripeOnboardingService
  ) {}

  async getAccountLink(userId: string) {
    const profile = await this.profilesService.getProfileById(userId);
    if (!profile?.stripeRecipientAccountId) {
      throw new Error(
        "Payout account not found. Please start the setup first."
      );
    }

    // Don't create a link for an account that already finished onboarding.
    const alreadyComplete = await this.onboardingService.isAlreadyOnboarded(
      profile.stripeRecipientAccountId,
      profile.stripeRecipientOnboardingComplete ?? false
    );
    if (alreadyComplete) {
      await this.onboardingService.reconcileOnboarding(
        userId,
        profile,
        true,
        null,
        profile.stripeRecipientAccountId
      );
      return { url: null, alreadyConnected: true };
    }

    const { refreshUrl, returnUrl } = resolvePayoutOnboardingUrls();
    try {
      const accountLink =
        await this.stripePayoutsService.createRecipientOnboardingLink(
          profile.stripeRecipientAccountId,
          returnUrl,
          refreshUrl
        );

      return { url: accountLink.url, alreadyConnected: false };
    } catch (linkError) {
      if (this.stripePayoutsService.isAlreadyOnboardedError(linkError)) {
        await this.onboardingService.reconcileOnboarding(
          userId,
          profile,
          true,
          null,
          profile.stripeRecipientAccountId
        );
        return { url: null, alreadyConnected: true };
      }
      throw linkError;
    }
  }
}
