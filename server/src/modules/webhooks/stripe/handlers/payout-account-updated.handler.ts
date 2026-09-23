import { Injectable, Inject, Optional, Logger } from "@nestjs/common";
import { ProfilesService } from "modules/profiles/profiles.service";
import { StripePayoutsService } from "modules/stripe/payouts/services";
import { PayoutQueueService } from "modules/payout-queue/payout-queue.service";
import { RecruitmentPayoutQueueService } from "modules/recruitment/payout-queue/recruitment-payout-queue.service";
import { MarketplacePayoutQueueService } from "modules/global-marketplace/payout/marketplace-payout-queue.service";
import { V2ThinEvent } from "modules/stripe/stripe-v2.types";
import { AnyType } from "types/common";

/**
 * Handles v2 recipient-account events (Global Payouts onboarding). When a
 * recipient's local bank-account capability becomes `active`, we mark the user's
 * payout onboarding complete, persist their default payout method, and release
 * any payouts that were deferred while they were still onboarding.
 */
@Injectable()
export class PayoutAccountUpdatedHandler {
  private readonly logger = new Logger(PayoutAccountUpdatedHandler.name);

  constructor(
    @Inject(ProfilesService)
    private readonly profilesService: ProfilesService,
    @Inject(StripePayoutsService)
    private readonly stripePayoutsService: StripePayoutsService,
    @Optional()
    @Inject(PayoutQueueService)
    private readonly payoutQueueService?: PayoutQueueService,
    @Optional()
    @Inject(RecruitmentPayoutQueueService)
    private readonly recruitmentPayoutQueueService?: RecruitmentPayoutQueueService,
    @Optional()
    @Inject(MarketplacePayoutQueueService)
    private readonly marketplacePayoutQueueService?: MarketplacePayoutQueueService
  ) {}

  async handle(event: V2ThinEvent): Promise<void> {
    try {
      const accountId = event.related_object?.id;
      if (!accountId) {
        this.logger.debug(
          `PAYOUT_ACCOUNT_UPDATED :: handle : no related account id on event ${event.id}`
        );
        return;
      }

      const account =
        await this.stripePayoutsService.getRecipientAccount(accountId);

      // Resolve the payout method (the local bank account). Use the service
      // resolver, which coerces the v2 response (string OR object) to a clean id.
      const state =
        this.stripePayoutsService.getRecipientOnboardingState(account);
      let { payoutMethodId } = state;
      if (!payoutMethodId) {
        payoutMethodId =
          await this.stripePayoutsService.getDefaultPayoutMethodId(accountId);
      }

      // Authoritative "onboarded" detection (mirrors getPayoutStatus): the
      // capability may still be "verifying" right after the bank is added, so we
      // also treat a resolvable payout method as onboarded — otherwise the
      // webhook would fail to release deferred payouts.
      const onboarded = state.onboarded || !!payoutMethodId;
      if (!onboarded) {
        this.logger.debug(
          `Recipient account ${accountId} not onboarded yet — skipping release`
        );
        return;
      }

      const profile =
        await this.profilesService.getProfileByStripeRecipientAccountId(
          accountId
        );
      if (!profile) {
        this.logger.warn(
          `Profile not found for recipient account ${accountId}`
        );
        return;
      }

      if (
        !profile.stripeRecipientOnboardingComplete ||
        (payoutMethodId && payoutMethodId !== profile.stripePayoutMethodId)
      ) {
        await this.profilesService.updateProfile(profile.id, {
          stripeRecipientOnboardingComplete: true,
          stripePayoutMethodId: payoutMethodId ?? null,
        } as AnyType);
      }

      this.logger.log(
        `Recipient account ${accountId} active for user ${profile.id}. Processing deferred payouts.`
      );

      if (this.payoutQueueService) {
        try {
          const result =
            await this.payoutQueueService.processDeferredPayoutsForConnector(
              profile.id
            );
          if (result.processed > 0) {
            this.logger.log(
              `Processed ${result.processed} deferred payout(s) for ${profile.id}`
            );
          }
          if (result.failed > 0) {
            this.logger.warn(
              `Failed ${result.failed} deferred payout(s) for ${profile.id}: ${result.errors.join(", ")}`
            );
          }
        } catch (error) {
          this.logger.error(
            `PAYOUT_ACCOUNT_UPDATED :: deferred(prospecting) : ERROR : ${error}`
          );
        }
      }

      if (this.recruitmentPayoutQueueService) {
        try {
          const recruitmentResult =
            await this.recruitmentPayoutQueueService.processDeferredPayoutsForRecipient(
              profile.id
            );
          if (recruitmentResult.processed > 0) {
            this.logger.log(
              `Processed ${recruitmentResult.processed} deferred recruitment payout(s) for ${profile.id}`
            );
          }
          if (recruitmentResult.failed > 0) {
            this.logger.warn(
              `Failed ${recruitmentResult.failed} deferred recruitment payout(s) for ${profile.id}: ${recruitmentResult.errors.join(", ")}`
            );
          }
        } catch (error) {
          this.logger.error(
            `PAYOUT_ACCOUNT_UPDATED :: deferred(recruitment) : ERROR : ${error}`
          );
        }
      }

      if (this.marketplacePayoutQueueService) {
        try {
          const marketplaceCount =
            await this.marketplacePayoutQueueService.releaseDeferredMarketplacePayoutsForUser(
              profile.id
            );
          if (marketplaceCount > 0) {
            this.logger.log(
              `Re-queued ${marketplaceCount} deferred marketplace payout(s) for ${profile.id}`
            );
          }
        } catch (error) {
          this.logger.error(
            `PAYOUT_ACCOUNT_UPDATED :: deferred(marketplace) : ERROR : ${error}`
          );
        }
      }
    } catch (error) {
      // Never throw from a webhook handler — log for reconciliation.
      this.logger.error(`PAYOUT_ACCOUNT_UPDATED :: handle : ERROR : ${error}`);
    }
  }
}
