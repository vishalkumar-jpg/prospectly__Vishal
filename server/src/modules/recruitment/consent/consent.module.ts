import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule } from "@nestjs/config";
import jwtConfig from "config/jwt.config";
import { EmailsModule } from "modules/emails/emails.module";
import { MediaModule } from "modules/media/media.module";
import { ResumeExtractionQueueModule } from "modules/recruitment/resume-extraction/resume-extraction-queue.module";
import { CandidateEvaluationModule } from "modules/recruitment/candidate-evaluation/candidate-evaluation.module";
import { CandidateConnectorsModule } from "modules/recruitment/candidate-connectors/candidate-connectors.module";
import { RecruitmentPayoutSplitModule } from "modules/recruitment/payout/recruitment-payout-split.module";
import { RecruitmentJobShareModule } from "modules/recruitment/share/share.module";
import { RecruitmentNotificationsModule } from "modules/recruitment/notifications/recruitment-notifications.module";
import { RecruitmentEmailLogsModule } from "modules/recruitment/email-logs/recruitment-email-logs.module";
import { ConsentController } from "./consent.controller";
import { ConsentEmailSendQueueModule } from "./consent-email-send-queue.module";
import {
  ConsentTokenService,
  ConsentEmailService,
  ConsentVerifyService,
  ConsentSendService,
  ConsentResendService,
  ConsentDeclineService,
  ConsentApplyService,
  ConsentUpdateEmailService,
} from "./services";

@Module({
  imports: [
    JwtModule.register({}),
    ConfigModule.forFeature(jwtConfig),
    EmailsModule,
    MediaModule,
    ResumeExtractionQueueModule,
    CandidateEvaluationModule,
    CandidateConnectorsModule,
    RecruitmentPayoutSplitModule,
    RecruitmentJobShareModule,
    forwardRef(() => RecruitmentNotificationsModule),
    forwardRef(() => RecruitmentEmailLogsModule),
    ConsentEmailSendQueueModule,
  ],
  controllers: [ConsentController],
  providers: [
    ConsentTokenService,
    ConsentEmailService,
    ConsentVerifyService,
    ConsentSendService,
    ConsentResendService,
    ConsentDeclineService,
    ConsentApplyService,
    ConsentUpdateEmailService,
  ],
  exports: [ConsentSendService, ConsentResendService, ConsentEmailService],
})
export class ConsentModule {}
