import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  MARKETPLACE_PAYOUT_QUEUE_NAME,
  MARKETPLACE_PAYOUT_JOB_TYPES,
  MARKETPLACE_PAYOUT_QUEUE_CONFIG,
} from "./marketplace-payout.constants";
import { PayoutJobData } from "./marketplace-payout.types";
import { MarketplacePayoutHelper } from "./marketplace-payout-helper";

@Injectable()
export class MarketplacePayoutQueueService {
  private readonly logger = new Logger(MarketplacePayoutQueueService.name);

  constructor(
    @InjectQueue(MARKETPLACE_PAYOUT_QUEUE_NAME)
    private readonly queue: Queue<PayoutJobData>,
    private readonly marketplacePayoutHelper: MarketplacePayoutHelper
  ) {}

  /**
   * Re-queues marketplace payouts that were deferred (ONBOARDING_PENDING) for a
   * user who has now connected their bank. The processor re-runs both roles for
   * each request; already-completed roles are skipped, the newly-onboarded
   * role pays. Returns the number of requests re-queued.
   */
  async releaseDeferredMarketplacePayoutsForUser(
    userId: string
  ): Promise<number> {
    const requestIds =
      await this.marketplacePayoutHelper.getDeferredMarketplaceRequestIdsForUser(
        userId
      );

    let queued = 0;
    for (const requestId of requestIds) {
      try {
        await this.queueMarketplacePayout(requestId);
        queued++;
      } catch (error) {
        this.logger.error(
          `MARKETPLACE_PAYOUT_QUEUE :: releaseDeferred : ERROR re-queuing ${requestId} : ${error}`
        );
      }
    }
    return queued;
  }

  /**
   * Queue a marketplace payout job for processing
   */
  async queueMarketplacePayout(
    introductionRequestId: string,
    transactionId?: string
  ): Promise<string> {
    const jobId = `marketplace-payout-${introductionRequestId}`;

    const job = await this.queue.add(
      MARKETPLACE_PAYOUT_JOB_TYPES.PROCESS_MARKETPLACE_PAYOUT,
      {
        introductionRequestId,
        transactionId,
      },
      {
        ...MARKETPLACE_PAYOUT_QUEUE_CONFIG.defaultJobOptions,
        jobId,
      }
    );

    this.logger.log(
      `Queued marketplace payout job ${job.id} for request ${introductionRequestId}`
    );

    return job.id || "";
  }

  /**
   * Get job status by ID
   */
  async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    return {
      id: job.id,
      name: job.name,
      state,
      progress: job.progress,
      returnValue: job.returnvalue,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    };
  }
}
