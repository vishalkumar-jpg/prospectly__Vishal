import { Module } from "@nestjs/common";
import { TrustScoreQueueModule } from "modules/trust-score-queue/trust-score-queue.module";
import { IntroductionNotificationsModule } from "modules/introductions/notifications/introduction-notifications.module";
import { IntroductionPotentialConnectorsController } from "./introduction-potential-connectors.controller";
import { IntroductionPotentialConnectorsService } from "./introduction-potential-connectors.service";
import { IntroductionEstimatesHelper } from "./helpers/introduction-estimates.helper";
import { IntroductionPrivacyService } from "./introduction-privacy.service";

@Module({
  imports: [TrustScoreQueueModule, IntroductionNotificationsModule],
  controllers: [IntroductionPotentialConnectorsController],
  providers: [
    IntroductionPotentialConnectorsService,
    IntroductionEstimatesHelper,
    IntroductionPrivacyService,
  ],
  exports: [
    IntroductionPotentialConnectorsService,
    IntroductionEstimatesHelper,
    IntroductionPrivacyService,
  ],
})
export class IntroductionPotentialConnectorsModule {}
