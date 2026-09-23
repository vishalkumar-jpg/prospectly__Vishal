import { Module, forwardRef } from "@nestjs/common";
import { IntroductionPotentialConnectorsModule } from "modules/introduction-potential-connectors/introduction-potential-connectors.module";
import { IntroductionNotificationsModule } from "modules/introductions/notifications/introduction-notifications.module";
import { PaymentsModule } from "modules/payments/payments.module";
import { SystemConfigurationModule } from "modules/system-configuration/system-configuration.module";
import { WorkflowService } from "./workflow.service";
import { WorkflowController } from "./workflow.controller";
import { UnfulfillmentService } from "./unfulfillment.service";
import { RepublishService } from "./republish.service";
import { DeepLinkStatusService } from "./deep-link-status.service";
import { IntroductionsModule } from "../introductions.module";
import { RefundsModule } from "../refunds/refunds.module";

@Module({
  imports: [
    IntroductionPotentialConnectorsModule,
    IntroductionNotificationsModule,
    PaymentsModule,
    forwardRef(() => IntroductionsModule),
    RefundsModule,
    SystemConfigurationModule,
  ],
  controllers: [WorkflowController],
  providers: [
    WorkflowService,
    UnfulfillmentService,
    RepublishService,
    DeepLinkStatusService,
  ],
  exports: [
    WorkflowService,
    UnfulfillmentService,
    RepublishService,
    DeepLinkStatusService,
  ],
})
export class WorkflowModule {}
