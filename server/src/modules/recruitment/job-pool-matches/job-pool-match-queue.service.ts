import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  JOB_POOL_MATCH_QUEUE_NAME,
  QUEUE_JOBS,
} from "./job-pool-matches.constants";

@Injectable()
export class JobPoolMatchQueueService {
  private readonly logger = new Logger(JobPoolMatchQueueService.name);

  constructor(
    @InjectQueue(JOB_POOL_MATCH_QUEUE_NAME)
    private readonly queue: Queue
  ) {}

  async queueJobMatchCompute(jobId: string): Promise<void> {
    await this.queue.add(
      QUEUE_JOBS.COMPUTE_FOR_JOB,
      { jobId },
      { jobId: `job-${jobId}-${Date.now()}` }
    );
    this.logger.log(`Queued match computation for job ${jobId}`);
  }

  async queueContactMatchCompute(userId: string): Promise<void> {
    await this.queue.add(
      QUEUE_JOBS.COMPUTE_FOR_CONTACTS,
      { userId },
      { jobId: `contacts-${userId}-${Date.now()}` }
    );
    this.logger.log(`Queued match computation for user contacts ${userId}`);
  }

  async queueContactEmbeddingGeneration(
    contactIds: number[],
    initiatedByUserId?: string
  ): Promise<void> {
    await this.queue.add(
      QUEUE_JOBS.GENERATE_CONTACT_EMBEDDINGS,
      { contactIds, userId: initiatedByUserId },
      { jobId: `embeddings-${Date.now()}` }
    );
    this.logger.log(
      `Queued embedding generation for ${contactIds.length} contacts`
    );
  }

  async queueBackfillContactEmbeddings(): Promise<void> {
    await this.queue.add(
      QUEUE_JOBS.BACKFILL_CONTACT_EMBEDDINGS,
      {},
      { jobId: `backfill-embeddings-${Date.now()}` }
    );
    this.logger.log(`Queued backfill of all contact embeddings`);
  }
}
