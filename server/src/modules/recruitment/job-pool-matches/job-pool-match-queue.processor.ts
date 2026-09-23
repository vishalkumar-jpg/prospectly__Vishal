import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import {
  JOB_POOL_MATCH_QUEUE_NAME,
  QUEUE_JOBS,
} from "./job-pool-matches.constants";
import { JobPoolMatchesComputeService } from "./services/job-pool-matches-compute.service";
import { EmbeddingService } from "./services/embedding.service";

@Processor(JOB_POOL_MATCH_QUEUE_NAME)
export class JobPoolMatchQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(JobPoolMatchQueueProcessor.name);

  constructor(
    private readonly computeService: JobPoolMatchesComputeService,
    private readonly embeddingService: EmbeddingService
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job-pool-match job ${job.id} (${job.name})`);

    switch (job.name) {
      case QUEUE_JOBS.COMPUTE_FOR_JOB:
        await this.computeService.computeMatchesForJob(job.data.jobId);
        break;
      case QUEUE_JOBS.COMPUTE_FOR_CONTACTS:
        await this.computeService.computeMatchesForUserContacts(
          job.data.userId
        );
        break;
      case QUEUE_JOBS.GENERATE_CONTACT_EMBEDDINGS:
        await this.embeddingService.generateContactEmbeddings(
          job.data.contactIds,
          job.data.userId
            ? {
                userId: job.data.userId,
                actionType: "contact-embedding-queued",
              }
            : undefined
        );
        break;
      case QUEUE_JOBS.BACKFILL_CONTACT_EMBEDDINGS:
        await this.embeddingService.backfillAllContactEmbeddings();
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        this.logger.error(`Unknown job name: ${job.name}`);
        throw new Error(`Unsupported job name: ${job.name}`);
    }
  }
}
