import { Injectable, Logger } from "@nestjs/common";
import { RecruitmentNotificationQueueService } from "../../notifications/recruitment-notification-queue.service";
import { CollaboratorAddedEmailJobData } from "../../notifications/recruitment-notifications.constants";

@Injectable()
export class RecruitmentCollaborationNotifierService {
  private readonly logger = new Logger(
    RecruitmentCollaborationNotifierService.name
  );

  constructor(
    private readonly queueService: RecruitmentNotificationQueueService
  ) {}

  /**
   * Enqueue the opt-in "you've been added as a collaborator" email so it is sent
   * by the worker (off the request path). Reuses the shared notification queue
   * service so it travels the same proven path as job-post notifications.
   * Best-effort: an enqueue failure is logged but never blocks the add.
   */
  async enqueueCollaboratorAddedEmail(
    data: CollaboratorAddedEmailJobData
  ): Promise<void> {
    try {
      await this.queueService.enqueueCollaboratorAddedEmail(data);
    } catch (error) {
      this.logger.error(
        `RECRUITMENT_COLLABORATION_NOTIFIER :: ENQUEUE_ADDED_EMAIL : ERROR : ${error}`
      );
    }
  }
}
