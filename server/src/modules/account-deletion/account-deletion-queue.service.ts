import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import type { AccountDeletionJobData } from "./account-deletion-queue.types";
import {
  ACCOUNT_DELETION_JOB_NAME,
  ACCOUNT_DELETION_MAX_DELAY_MS,
  ACCOUNT_DELETION_QUEUE_CONFIG,
  ACCOUNT_DELETION_QUEUE_NAME,
} from "./account-deletion-queue.constants";

@Injectable()
export class AccountDeletionQueueService {
  private readonly logger = new Logger(AccountDeletionQueueService.name);

  constructor(
    @InjectQueue(ACCOUNT_DELETION_QUEUE_NAME)
    private readonly queue: Queue<AccountDeletionJobData>
  ) {}

  async enqueuePurge(userId: string, delayMs: number): Promise<void> {
    if (!Number.isFinite(delayMs) || delayMs < 0) {
      throw new Error(`Invalid delayMs for account deletion: ${delayMs}`);
    }

    const clampedDelay = Math.min(delayMs, ACCOUNT_DELETION_MAX_DELAY_MS);

    const jobData: AccountDeletionJobData = { userId };
    await this.queue.add(ACCOUNT_DELETION_JOB_NAME, jobData, {
      ...ACCOUNT_DELETION_QUEUE_CONFIG.defaultJobOptions,
      jobId: `account-deletion-${userId}`,
      delay: clampedDelay,
    });
    this.logger.log(
      `Queued account purge for ${userId} with delay ${clampedDelay}ms`
    );
  }

  async removeScheduledPurge(userId: string): Promise<void> {
    const jobId = `account-deletion-${userId}`;
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Removed scheduled purge job ${jobId}`);
    }
  }
}
