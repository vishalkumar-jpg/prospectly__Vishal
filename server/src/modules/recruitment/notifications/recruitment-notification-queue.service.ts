import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { toUTC } from "utils/dayjs";
import type { InterviewBookingErrorJobData } from "./processors/interview-booking-error.processor-helper";
import type { RecruitmentLifecycleJobData } from "./recruitment-lifecycle-notifications.constants";
import type { JobClosedNotificationJobData } from "../jobs/job-close-notification.constants";
import type { JobReopenedNotificationJobData } from "../jobs/job-reopen-notification.constants";
import {
  RECRUITMENT_NOTIFICATION_QUEUE_NAME,
  RECRUITMENT_NOTIFICATION_QUEUE_JOBS,
  CollaboratorAddedEmailJobData,
  buildInterviewBookingErrorJobId,
} from "./recruitment-notifications.constants";
import { buildLifecycleJobId } from "./recruitment-lifecycle-notifications.constants";

export interface NewJobPostNotificationJobData {
  notificationId: string;
}

export type { InterviewBookingErrorJobData };
export type { RecruitmentLifecycleJobData };
export type { JobClosedNotificationJobData };
export type { JobReopenedNotificationJobData };

@Injectable()
export class RecruitmentNotificationQueueService {
  private readonly logger = new Logger(
    RecruitmentNotificationQueueService.name
  );

  constructor(
    @InjectQueue(RECRUITMENT_NOTIFICATION_QUEUE_NAME)
    private readonly queue: Queue
  ) {}

  async queueNewJobPostNotification(notificationId: string): Promise<void> {
    await this.queue.add(
      RECRUITMENT_NOTIFICATION_QUEUE_JOBS.SEND_NEW_JOB_POST,
      { notificationId } satisfies NewJobPostNotificationJobData,
      { jobId: `notify-${notificationId}` }
    );
    this.logger.log(
      `Queued new-job-post notification ${notificationId} for sending`
    );
  }

  async enqueueCollaboratorAddedEmail(
    data: CollaboratorAddedEmailJobData
  ): Promise<void> {
    // Unique per add-event: a timestamp suffix prevents BullMQ from treating a
    // re-add as a duplicate. A static `collab-added-<job>-<user>` id collides
    // with the retained completed job (removeOnComplete keeps it 7 days), so a
    // remove-then-readd within that window would be silently dropped and never
    // emailed. Duplicate active adds are already blocked in the add service, so
    // losing the static-id idempotency here is safe.
    await this.queue.add(
      RECRUITMENT_NOTIFICATION_QUEUE_JOBS.SEND_COLLABORATOR_ADDED,
      data,
      {
        jobId: `collab-added-${data.jobId}-${data.collaboratorUserId}-${toUTC().getTime()}`,
      }
    );
    this.logger.log(
      `Queued collaborator-added email for ${data.collaboratorUserId} on job ${data.jobId}`
    );
  }

  async queueInterviewBookingErrorNotification(
    data: InterviewBookingErrorJobData
  ): Promise<void> {
    const jobId = buildInterviewBookingErrorJobId(
      data.candidateId,
      data.stage,
      data.errorMessage
    );
    await this.queue.add(
      RECRUITMENT_NOTIFICATION_QUEUE_JOBS.SEND_INTERVIEW_BOOKING_ERROR,
      data,
      { jobId }
    );
    this.logger.log(
      `Queued interview-booking-error notification for candidate ${data.candidateId} (${data.stage})`
    );
  }

  async queueLifecycleNotification(
    data: RecruitmentLifecycleJobData
  ): Promise<void> {
    const jobId = buildLifecycleJobId(data);
    await this.queue.add(
      RECRUITMENT_NOTIFICATION_QUEUE_JOBS.SEND_LIFECYCLE,
      data,
      { jobId }
    );
    this.logger.log(
      `Queued lifecycle notification type=${data.type} jobId=${jobId}`
    );
  }

  async queueJobClosedNotification(
    data: JobClosedNotificationJobData
  ): Promise<void> {
    await this.queue.add(
      RECRUITMENT_NOTIFICATION_QUEUE_JOBS.SEND_JOB_CLOSED,
      data,
      { jobId: `job-closed-${data.jobId}-${toUTC().getTime()}` }
    );
    this.logger.log(`Queued job-closed notifications for job ${data.jobId}`);
  }

  async queueJobReopenedNotification(
    data: JobReopenedNotificationJobData
  ): Promise<void> {
    await this.queue.add(
      RECRUITMENT_NOTIFICATION_QUEUE_JOBS.SEND_JOB_REOPENED,
      data,
      { jobId: `job-reopened-${data.jobId}-${toUTC().getTime()}` }
    );
    this.logger.log(`Queued job-reopened notifications for job ${data.jobId}`);
  }
}
