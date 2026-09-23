import { Logger } from "@nestjs/common";
import { EmailsService } from "modules/emails/emails.service";
import { delay } from "modules/emails/retry";
import {
  INTRODUCTION_NOTIFICATION_BATCH_DELAY_MS,
  INTRODUCTION_NOTIFICATION_EMAIL_BATCH_SIZE,
} from "../introduction-notifications.constants";

export type BatchEmailPayload = {
  to: string;
  subject: string;
  html: string;
  slug?: string;
};

export async function sendEmailsInBatches(
  emailsService: EmailsService,
  logger: Logger,
  emails: BatchEmailPayload[],
  context: string
): Promise<{ sentCount: number; failedCount: number }> {
  if (emails.length === 0) {
    return { sentCount: 0, failedCount: 0 };
  }

  let sentCount = 0;
  let failedCount = 0;

  for (
    let i = 0;
    i < emails.length;
    i += INTRODUCTION_NOTIFICATION_EMAIL_BATCH_SIZE
  ) {
    const chunk = emails.slice(
      i,
      i + INTRODUCTION_NOTIFICATION_EMAIL_BATCH_SIZE
    );
    const result = await emailsService.sendBatch(chunk);
    sentCount += result.sentCount;
    failedCount += result.failedCount;

    if (result.error) {
      logger.warn(
        `INTRO_NOTIFICATION_SEND :: ${context} :: batch error : ${result.error}`
      );
    }

    if (i + INTRODUCTION_NOTIFICATION_EMAIL_BATCH_SIZE < emails.length) {
      await delay(INTRODUCTION_NOTIFICATION_BATCH_DELAY_MS);
    }
  }

  logger.log(
    `INTRO_NOTIFICATION_SEND :: ${context} :: sent=${sentCount} failed=${failedCount}`
  );
  return { sentCount, failedCount };
}
