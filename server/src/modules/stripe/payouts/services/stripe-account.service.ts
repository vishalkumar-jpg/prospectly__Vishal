import { Injectable, Inject } from "@nestjs/common";
import { ProfilesService } from "modules/profiles/profiles.service";
import { isSupportedPayoutCountry } from "config/payment.config";
import { AnyType } from "types/common";
import { StripePayoutsService } from "./stripe-payouts.service";
import { StripeOnboardingService } from "./stripe-onboarding.service";
import { CreatePayoutAccountDto } from "../payout-onboarding.dto";
import { resolvePayoutOnboardingUrls } from "../payout-onboarding.helpers";

/**
 * Creates a Global Payouts recipient account (if needed) and returns a
 * Stripe-hosted onboarding link for `POST /stripe/payouts/account`.
 */
@Injectable()
export class StripeAccountService {
  constructor(
    @Inject(ProfilesService)
    private readonly profilesService: ProfilesService,
    @Inject(StripePayoutsService)
    private readonly stripePayoutsService: StripePayoutsService,
    @Inject(StripeOnboardingService)
    private readonly onboardingService: StripeOnboardingService
  ) {}

  async createAccount(userId: string, body: CreatePayoutAccountDto) {
    const profile = await this.profilesService.getProfileById(userId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    // Payout country must be set first — it determines the recipient's local
    // settlement currency and the Stripe-hosted onboarding requirements.
    if (!isSupportedPayoutCountry(profile.country)) {
      throw new Error(
        "Please select a supported payout country before adding a bank account"
      );
    }

    let accountId = profile.stripeRecipientAccountId;

    // Create the recipient account if it doesn't exist yet.
    if (!accountId) {
      const account = await this.stripePayoutsService.createRecipientAccount(
        profile.email!,
        profile.country!,
        profile.fullName ?? undefined,
        { userId }
      );
      accountId = account.id;

      await this.profilesService.updateProfile(userId, {
        stripeRecipientAccountId: accountId,
      } as AnyType);
    } else {
      // Existing account: if onboarding is already complete, do NOT create a
      // new onboarding link (Stripe rejects links for completed accounts).
      const alreadyComplete = await this.onboardingService.isAlreadyOnboarded(
        accountId,
        profile.stripeRecipientOnboardingComplete ?? false
      );
      if (alreadyComplete) {
        await this.onboardingService.reconcileOnboarding(
          userId,
          profile,
          true,
          null,
          accountId
        );
        return {
          accountId,
          url: null,
          alreadyConnected: true,
          message: "Your bank account is already connected",
        };
      }
    }

    const { refreshUrl, returnUrl } = resolvePayoutOnboardingUrls(body);
    try {
      const accountLink =
        await this.stripePayoutsService.createRecipientOnboardingLink(
          accountId,
          returnUrl,
          refreshUrl
        );

      return {
        accountId,
        url: accountLink.url,
        alreadyConnected: false,
        message: "Please complete the bank account onboarding process",
      };
    } catch (linkError) {
      // Authoritative completion signal: Stripe refuses links for onboarded
      // accounts. Treat as connected and persist so the UI stops offering it.
      if (this.stripePayoutsService.isAlreadyOnboardedError(linkError)) {
        await this.onboardingService.reconcileOnboarding(
          userId,
          profile,
          true,
          null,
          accountId
        );
        return {
          accountId,
          url: null,
          alreadyConnected: true,
          message: "Your bank account is already connected",
        };
      }
      throw linkError;
    }
  }
}
