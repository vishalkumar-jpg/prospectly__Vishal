import { forwardRef, Module } from "@nestjs/common";
import { OnboardingModule } from "modules/onboarding/onboarding.module";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule } from "@nestjs/config";
import jwtConfig from "config/jwt.config";
import { EmailsModule } from "modules/emails/emails.module";
import { NotificationPreferencesModule } from "modules/notification-preferences/notification-preferences.module";
import { StripeModule } from "modules/stripe/stripe.module";
import { ReferralQueueModule } from "modules/referral-queue/referral-queue.module";
import { ReferralsModule } from "modules/referrals/referrals.module";
import { ContactsModule } from "modules/contacts/contacts.module";
import { InvitesController } from "./invites.controller";
import { InvitesService } from "./invites.service";

@Module({
  imports: [
    forwardRef(() => OnboardingModule),
    forwardRef(() => ReferralsModule),
    ContactsModule,
    JwtModule.register({}),
    ConfigModule.forFeature(jwtConfig),
    EmailsModule,
    NotificationPreferencesModule,
    StripeModule,
    ReferralQueueModule,
  ],
  controllers: [InvitesController],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}
