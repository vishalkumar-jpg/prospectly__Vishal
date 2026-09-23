import { Injectable, Inject, Logger } from "@nestjs/common";
import { ProfilesService } from "modules/profiles/profiles.service";
import {
  isSupportedPayoutCountry,
  PAYOUT_COUNTRY_CONFIG,
  PayoutCountryCode,
} from "config/payment.config";
import { StripePayoutsService } from "./stripe-payouts.service";
import { StripeOnboardingService } from "./stripe-onboarding.service";

/** Builds the payout status payload for `GET /stripe/payouts/status`. */
@Injectable()
export class StripeStatusService {
  private readonly logger = new Logger(StripeStatusService.name);

  constructor(
    @Inject(ProfilesService)
    private readonly profilesService: ProfilesService,
    @Inject(StripePayoutsService)
    private readonly stripePayoutsService: StripePayoutsService,
    @Inject(StripeOnboardingService)
    private readonly onboardingService: StripeOnboardingService
  ) {}

  async getStatus(userId: string) {
    try {
      const profile = await this.profilesService.getProfileById(userId);

      const country = profile?.country ?? null;
      const payoutCurrency = profile?.payoutCurrency ?? null;
      const countryName =
        country && isSupportedPayoutCountry(country)
          ? PAYOUT_COUNTRY_CONFIG[country as PayoutCountryCode].name
          : null;

      if (!profile?.stripeRecipientAccountId) {
        return {
          isConnected: false,
          accountId: null,
          onboardingComplete: false,
          payoutsReady: false,
          capabilityStatus: null,
          requiresAction: !!country,
          country,
          countryName,
          payoutCurrency,
          message: country
            ? "Add your local bank account to start receiving payouts"
            : "Select your payout country to get started",
        };
      }

      // An account exists → the user is at least partially connected. A resolved
      // payout method makes it fully connected; without one, information is still
      // needed. Try to read the live state, but never downgrade an existing
      // account to "not connected" if the v2 read fails.
      let capabilityStatus: string | null = null;
      let onboardingComplete =
        profile.stripeRecipientOnboardingComplete ?? false;
      let payoutsReady = false;
      let payoutMethodId = profile.stripePayoutMethodId ?? null;

      try {
        const account = await this.stripePayoutsService.getRecipientAccount(
          profile.stripeRecipientAccountId
        );
        const state =
          this.stripePayoutsService.getRecipientOnboardingState(account);

        capabilityStatus =
          this.stripePayoutsService.getEffectiveBankCapabilityStatus(account);

        // Authoritative onboarded signal: a recipient can't finish the hosted
        // form without adding a local bank account, which becomes a payout
        // method. Resolve it (default destination, else list).
        payoutMethodId = state.payoutMethodId ?? payoutMethodId;
        if (!payoutMethodId) {
          try {
            const methods = await this.stripePayoutsService.listPayoutMethods(
              profile.stripeRecipientAccountId
            );
            payoutMethodId = methods[0]?.id ?? null;
          } catch (methodError) {
            this.logger.warn(
              `STRIPE_STATUS_SERVICE :: getStatus : payout method list failed : ${methodError}`
            );
          }
        }

        // A resolved payout method is the ONLY authoritative "actually connected"
        // signal. Capability-active alone is NOT proof of a bank (the capability
        // flips active when granted), so an account with no payout method is only
        // partially connected — information still needed.
        const hasPayoutMethod = !!payoutMethodId;
        onboardingComplete = hasPayoutMethod;
        payoutsReady = state.capabilityActive && hasPayoutMethod;

        // Self-heal: persist the onboarding flag + payout method so the system
        // works even before the v2 webhook is configured.
        await this.onboardingService.reconcileOnboarding(
          userId,
          profile,
          onboardingComplete,
          payoutMethodId,
          null /* already resolved above */
        );
      } catch (fetchError) {
        this.logger.warn(
          `STRIPE_STATUS_SERVICE :: getStatus : recipient fetch failed, using stored payout method : ${fetchError}`
        );
        // v2 read failed — fall back to the persisted payout method id (seeded
        // into payoutMethodId above), not the standalone onboarding boolean.
        onboardingComplete = !!payoutMethodId;
        if (onboardingComplete) {
          capabilityStatus = "active";
          payoutsReady = true;
        }
      }

      return {
        isConnected: true,
        accountId: profile.stripeRecipientAccountId,
        onboardingComplete,
        payoutsReady,
        capabilityStatus,
        requiresAction: !onboardingComplete,
        country,
        countryName,
        payoutCurrency,
        payoutMethodId,
        message: payoutsReady
          ? "Your bank account is set up and ready to receive payouts"
          : onboardingComplete
            ? "Your bank account is connected — Stripe is verifying it"
            : "Please complete your bank account setup to start receiving payouts",
      };
    } catch (error) {
      this.logger.error(
        `STRIPE_STATUS_SERVICE :: getStatus : ERROR : ${error}`
      );
      return {
        isConnected: false,
        accountId: null,
        onboardingComplete: false,
        payoutsReady: false,
        capabilityStatus: null,
        requiresAction: true,
        country: null,
        countryName: null,
        payoutCurrency: null,
        message: "Unable to verify payout status",
      };
    }
  }
}
