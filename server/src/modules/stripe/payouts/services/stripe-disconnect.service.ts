import { Injectable, Inject } from "@nestjs/common";
import { ProfilesService } from "modules/profiles/profiles.service";
import { AnyType } from "types/common";

/**
 * Detaches a recipient account from the user's profile (keeps the Stripe
 * account) — `POST /stripe/payouts/disconnect`.
 */
@Injectable()
export class StripeDisconnectService {
  constructor(
    @Inject(ProfilesService)
    private readonly profilesService: ProfilesService
  ) {}

  async disconnect(userId: string) {
    const profile = await this.profilesService.getProfileById(userId);
    if (!profile?.stripeRecipientAccountId) {
      throw new Error("No payout account to disconnect");
    }

    // Detach the recipient account from the platform (keeps the Stripe account).
    await this.profilesService.updateProfile(userId, {
      stripeRecipientAccountId: null,
      stripePayoutMethodId: null,
      stripeRecipientOnboardingComplete: false,
    } as AnyType);

    return {
      message: "Payout account disconnected successfully",
      success: true,
    };
  }
}
