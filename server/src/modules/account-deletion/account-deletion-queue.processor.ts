import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger, Inject, forwardRef } from "@nestjs/common";
import { Job } from "bullmq";
import type { AccountDeletionJobData } from "./account-deletion-queue.types";
import {
  ACCOUNT_DELETION_JOB_NAME,
  ACCOUNT_DELETION_QUEUE_NAME,
} from "./account-deletion-queue.constants";
import { AccountDeletionService } from "./account-deletion.service";

@Processor(ACCOUNT_DELETION_QUEUE_NAME)
export class AccountDeletionQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(AccountDeletionQueueProcessor.name);

  constructor(
    @Inject(forwardRef(() => AccountDeletionService))
    private readonly accountDeletionService: AccountDeletionService
  ) {
    super();
  }

  async process(job: Job<AccountDeletionJobData>): Promise<void> {
    if (job.name !== ACCOUNT_DELETION_JOB_NAME) {
      this.logger.warn(`Ignoring unknown job ${job.name}`);
      return;
    }
    const { userId } = job.data;
    try {
      await this.accountDeletionService.purgeUserData(userId);
    } catch (error) {
      this.logger.error(
        `ACCOUNT_DELETION_QUEUE_PROCESSOR :: processJob : ERROR : ${error instanceof Error ? error.message : error} [User: ${userId}] [Job: ${job.id}]`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }
}
