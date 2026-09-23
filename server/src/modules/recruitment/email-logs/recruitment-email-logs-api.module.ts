import { Module, forwardRef } from "@nestjs/common";
import { EmailsModule } from "modules/emails/emails.module";
import { ConsentModule } from "modules/recruitment/consent";
import { RecruitmentEmailLogsModule } from "./recruitment-email-logs.module";
import { RecruitmentEmailLogsController } from "./recruitment-email-logs.controller";
import { RecruitmentEmailLogsQueryService } from "./recruitment-email-logs-query.service";
import { RecruitmentEmailLogsResendService } from "./recruitment-email-logs-resend.service";
import { RecruitmentCollaborationModule } from "../collaboration/recruitment-collaboration.module";

/**
 * HTTP surface for recruitment email logs.
 *
 * Registered only in the API tree — its services resolve RecruitmentAccessService
 * for per-job authorization, which the worker process neither has nor needs.
 */
@Module({
  imports: [
    RecruitmentEmailLogsModule,
    EmailsModule,
    forwardRef(() => ConsentModule),
    RecruitmentCollaborationModule,
  ],
  controllers: [RecruitmentEmailLogsController],
  providers: [
    RecruitmentEmailLogsQueryService,
    RecruitmentEmailLogsResendService,
  ],
})
export class RecruitmentEmailLogsApiModule {}
