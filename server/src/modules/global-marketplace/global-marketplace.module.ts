import { Module } from "@nestjs/common";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { ContactsModule } from "modules/contacts/contacts.module";
import { IntroductionsModule } from "modules/introductions/introductions.module";
import { MarketplacePublicController } from "./controllers/marketplace-public.controller";
import { MarketplaceProtectedController } from "./controllers/marketplace-protected.controller";
import { SharerTrackingController } from "./controllers/sharer-tracking.controller";
import { MarketplaceShareController } from "./controllers/marketplace-share.controller";
import { MarketplaceClaimController } from "./controllers/marketplace-claim.controller";
import { MarketplaceVerificationController } from "./controllers/marketplace-verification.controller";
import { GlobalMarketplaceService } from "./global-marketplace.service";
import { MarketplaceShareService } from "./services/marketplace-share.service";
import { MarketplaceClaimService } from "./services/marketplace-claim.service";
import { MarketplaceAnalyticsService } from "./services/marketplace-analytics.service";
import { MarketplaceBrowseService } from "./services/marketplace-browse.service";
import { MarketplaceMetricsService } from "./services/marketplace-metrics.service";
import { MarketplaceClaimVerifyService } from "./services/marketplace-claim-verify.service";
import { MarketplaceCaptchaService } from "./services/marketplace-captcha.service";
import { MarketplaceClaimAuthService } from "./services/marketplace-claim-auth.service";
import { MarketplaceRateLimitGuard } from "./guards/marketplace-rate-limit.guard";
import { MarketplaceBotDetectionGuard } from "./guards/marketplace-bot-detection.guard";
import { ClaimVerificationModule } from "./claim";
import { MarketplacePayoutModule } from "./payout";

@Module({
  imports: [
    ClaimVerificationModule,
    MarketplacePayoutModule,
    ProfilesModule,
    ContactsModule,
    IntroductionsModule,
  ],
  controllers: [
    MarketplacePublicController,
    MarketplaceProtectedController,
    SharerTrackingController,
    MarketplaceShareController,
    MarketplaceClaimController,
    MarketplaceVerificationController,
  ],
  providers: [
    // Services
    GlobalMarketplaceService,
    MarketplaceBrowseService,
    MarketplaceMetricsService,
    MarketplaceShareService,
    MarketplaceClaimService,
    MarketplaceClaimVerifyService,
    MarketplaceAnalyticsService,
    MarketplaceCaptchaService,
    MarketplaceClaimAuthService,
    // Guards
    MarketplaceRateLimitGuard,
    MarketplaceBotDetectionGuard,
  ],
  exports: [
    GlobalMarketplaceService,
    MarketplaceBrowseService,
    MarketplaceMetricsService,
    MarketplaceShareService,
    MarketplaceClaimService,
    MarketplaceClaimVerifyService,
    MarketplaceAnalyticsService,
    MarketplaceCaptchaService,
    MarketplaceClaimAuthService,
  ],
})
export class GlobalMarketplaceModule {}
