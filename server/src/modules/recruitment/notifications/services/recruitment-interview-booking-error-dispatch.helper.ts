import { HttpException, Logger } from "@nestjs/common";
import type { InterviewBookingErrorStage } from "../recruitment-notifications.constants";
import { INTERVIEW_BOOKING_MESSAGES } from "../../interview-booking/interview-booking.constants";
import {
  InterviewBookingErrorJobData,
  RecruitmentNotificationQueueService,
} from "../recruitment-notification-queue.service";

async function queueBookingErrorJob(
  queueService: RecruitmentNotificationQueueService,
  logger: Logger,
  data: InterviewBookingErrorJobData
): Promise<void> {
  try {
    await queueService.queueInterviewBookingErrorNotification(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("already exists") || message.includes("JobId")) {
      logger.warn(
        `RECRUITMENT_INTERVIEW_BOOKING_ERROR_DISPATCH :: duplicate job skipped candidate=${data.candidateId} stage=${data.stage}`
      );
      return;
    }
    logger.error(
      `RECRUITMENT_INTERVIEW_BOOKING_ERROR_DISPATCH :: queue error: ${message}`
    );
  }
}

export async function dispatchInterviewBookingErrorNotification(
  queueService: RecruitmentNotificationQueueService,
  logger: Logger,
  params: {
    candidateId: string;
    error: unknown;
    stage: InterviewBookingErrorStage;
  }
): Promise<void> {
  const { candidateId, error, stage } = params;
  const errorMessage =
    error instanceof HttpException
      ? error.message
      : error instanceof Error
        ? error.message
        : "An unexpected error occurred during interview booking.";

  if (errorMessage === INTERVIEW_BOOKING_MESSAGES.ERROR.ALREADY_BOOKED) {
    return;
  }

  await queueBookingErrorJob(queueService, logger, {
    candidateId,
    errorMessage,
    stage,
  });
}
