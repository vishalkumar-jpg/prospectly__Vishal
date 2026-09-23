import { Module, forwardRef } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { ContactQueueModule } from "modules/contact-queue/contact-queue.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { UserConfigurationsModule } from "modules/user-configurations/user-configurations.module";
import { TrustScoreQueueModule } from "modules/trust-score-queue/trust-score-queue.module";
import { ClaimVerificationModule } from "modules/global-marketplace/claim";
import { JobPoolMatchesModule } from "modules/recruitment/job-pool-matches/job-pool-matches.module";
import { TypesenseSyncQueueModule } from "modules/typesense/sync-queue/typesense-sync-queue.module";
import { throttlerConfig } from "config/throttle.config";
import { ContactsController } from "./contacts.controller";
import { ContactImportAccountsController } from "./contact-import-accounts.controller";
import { ContactsService } from "./contacts.service";

import { ContactsSearchService } from "./contacts-search.service";

@Module({
  imports: [
    ThrottlerModule.forRoot(throttlerConfig),
    ContactQueueModule,
    ProfilesModule,
    UserConfigurationsModule,
    TrustScoreQueueModule,
    forwardRef(() => ClaimVerificationModule),
    JobPoolMatchesModule,
    TypesenseSyncQueueModule,
  ],
  controllers: [ContactImportAccountsController, ContactsController],
  providers: [ContactsService, ContactsSearchService],
  exports: [ContactsService, ContactsSearchService],
})
export class ContactsModule {}
