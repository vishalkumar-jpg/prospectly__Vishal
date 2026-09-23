import { forwardRef, Module } from "@nestjs/common";
import { AuthModule } from "modules/auth/auth.module";
import { OnboardingService } from "./onboarding.service";
import { InvitesModule } from "../invites/invites.module";
import { ProfilesModule } from "../profiles/profiles.module";
import { StripeModule } from "../stripe/stripe.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { WebhooksModule } from "../webhooks/webhooks.module";

@Module({
  imports: [
    forwardRef(() => InvitesModule),
    forwardRef(() => AuthModule),
    ProfilesModule,
    StripeModule,
    SubscriptionsModule,
    WebhooksModule,
  ],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
