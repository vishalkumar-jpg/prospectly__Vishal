import { forwardRef, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule } from "@nestjs/config";
import { SharedModule } from "shared/shared.module";
import { ContactQueueModule } from "modules/contact-queue/contact-queue.module";
import { CalendarModule } from "modules/calendar/calendar.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { StripeModule } from "modules/stripe/stripe.module";
import { OnboardingModule } from "modules/onboarding/onboarding.module";
import { GlobalMarketplaceModule } from "modules/global-marketplace/global-marketplace.module";
import { ConnectorOriginsModule } from "modules/recruitment/connector-origins/connector-origins.module";
import { ContactSourceStatusModule } from "modules/contact-source-status/contact-source-status.module";
import jwtConfig from "config/jwt.config";
import { RefreshTokenService } from "services/refreshTokenService";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthClaimFlowService } from "./auth-claim-flow.service";

@Module({
  imports: [
    SharedModule,
    PassportModule,
    JwtModule.register({}),
    ConfigModule.forFeature(jwtConfig),
    ContactQueueModule,
    CalendarModule,
    ProfilesModule,
    StripeModule,
    forwardRef(() => OnboardingModule),
    forwardRef(() => GlobalMarketplaceModule),
    ConnectorOriginsModule,
    ContactSourceStatusModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenService, AuthClaimFlowService],
  exports: [AuthService],
})
export class AuthModule {}
