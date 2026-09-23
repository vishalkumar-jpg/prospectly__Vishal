import { Module, forwardRef } from "@nestjs/common";
import { FinancesModule } from "modules/finances/finances.module";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { CalendarModule } from "modules/calendar/calendar.module";
import { BountyStagesModule } from "modules/bounty-stages/bounty-stages.module";
import { IntroductionPotentialConnectorsModule } from "modules/introduction-potential-connectors/introduction-potential-connectors.module";
import { RequesterPipelineService } from "./requester-pipeline.service";
import { RequesterPipelineController } from "./requester-pipeline.controller";
import { RequesterArchiveService } from "./requester-archive.service";
import { RequesterArchiveValidationService } from "./requester-archive-validation.service";
import { RequesterArchivePersistenceService } from "./requester-archive-persistence.service";
import { RequesterArchiveRefundService } from "./requester-archive-refund.service";
import { RefundsModule } from "../refunds/refunds.module";
import { IntroductionsModule } from "../introductions.module";

@Module({
  imports: [
    forwardRef(() => IntroductionsModule),
    RefundsModule,
    FinancesModule,
    ProfilesModule,
    CalendarModule,
    BountyStagesModule,
    IntroductionPotentialConnectorsModule,
  ],
  controllers: [RequesterPipelineController],
  providers: [
    RequesterPipelineService,
    RequesterArchiveService,
    RequesterArchiveValidationService,
    RequesterArchivePersistenceService,
    RequesterArchiveRefundService,
  ],
  exports: [
    RequesterPipelineService,
    RequesterArchiveService,
    RequesterArchiveValidationService,
    RequesterArchivePersistenceService,
    RequesterArchiveRefundService,
  ],
})
export class RequesterPipelineModule {}
