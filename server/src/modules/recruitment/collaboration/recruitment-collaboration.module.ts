import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EmailsModule } from "modules/emails/emails.module";
import { RecruitmentCollaborationController } from "./recruitment-collaboration.controller";
import {
  CollaboratorAddService,
  CollaboratorListService,
  CollaboratorRemoveService,
  CollaboratorRolesService,
  RecruitmentCollaborationNotifierService,
} from "./services";
import { RecruitmentAccessModule } from "./recruitment-access.module";
import { RecruitmentNotificationsModule } from "../notifications/recruitment-notifications.module";

/**
 * Collaboration feature: co-workers added to a job to help manage candidates.
 *
 * RecruitmentAccessService lives in RecruitmentAccessModule (imported here) so
 * worker/email-log paths can resolve access without pulling notification deps.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    EmailsModule,
    RecruitmentNotificationsModule,
    RecruitmentAccessModule,
  ],
  controllers: [RecruitmentCollaborationController],
  providers: [
    RecruitmentCollaborationNotifierService,
    CollaboratorListService,
    CollaboratorRolesService,
    CollaboratorAddService,
    CollaboratorRemoveService,
  ],
  exports: [RecruitmentAccessModule],
})
export class RecruitmentCollaborationModule {}
