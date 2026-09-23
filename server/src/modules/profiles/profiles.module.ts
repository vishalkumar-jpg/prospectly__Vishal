import { Module, forwardRef } from "@nestjs/common";
import { TrustScoreQueueModule } from "modules/trust-score-queue/trust-score-queue.module";
import { UserConfigurationsModule } from "modules/user-configurations/user-configurations.module";
import { NotificationPreferencesModule } from "modules/notification-preferences/notification-preferences.module";
import { AccountDeletionModule } from "modules/account-deletion/account-deletion.module";
import { ProfilesController } from "./profiles.controller";
import { ProfilesService } from "./profiles.service";
import { ProfilesValidationService } from "./profiles-validation.service";
import { ProfileCompletionController } from "./completion/profile-completion.controller";
import { ProfileCompletionService } from "./completion/profile-completion.service";
import { GeoLookupService } from "./completion/geo-lookup.service";
import { OrganizationLookupService } from "./completion/organization-lookup.service";
import { OrganizationMembershipService } from "./completion/organization-membership.service";
import { ProfileCompletionStateService } from "./completion/profile-completion-state.service";

@Module({
  imports: [
    TrustScoreQueueModule,
    UserConfigurationsModule,
    NotificationPreferencesModule,
    forwardRef(() => AccountDeletionModule),
  ],
  controllers: [ProfilesController, ProfileCompletionController],
  providers: [
    ProfilesService,
    ProfilesValidationService,
    ProfileCompletionService,
    GeoLookupService,
    OrganizationLookupService,
    OrganizationMembershipService,
    ProfileCompletionStateService,
  ],
  exports: [
    ProfilesService,
    ProfilesValidationService,
    OrganizationLookupService,
  ],
})
export class ProfilesModule {}
