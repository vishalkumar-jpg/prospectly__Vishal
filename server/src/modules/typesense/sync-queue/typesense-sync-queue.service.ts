import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ApolloCacheDocument } from "modules/typesense/core/typesense.types";
import {
  TYPESENSE_SYNC_QUEUE_NAME,
  TYPESENSE_SYNC_QUEUE_JOBS,
  TYPESENSE_SYNC_QUEUE_CONFIG,
} from "./constants/typesense-sync-queue.constants";
import {
  TypesenseSyncJobData,
  ContactSyncJobData,
  ApolloCacheSyncJobData,
} from "./typesense-sync-queue.types";

@Injectable()
export class TypesenseSyncQueueService {
  private readonly logger = new Logger(TypesenseSyncQueueService.name);

  constructor(
    @InjectQueue(TYPESENSE_SYNC_QUEUE_NAME)
    private readonly queue: Queue<TypesenseSyncJobData>
  ) {}

  async enqueueSyncJob(
    contactIds: string[],
    userId: string,
    source: string
  ): Promise<string> {
    this.logger.log(
      `Queueing typesense sync for ${contactIds.length} contacts (source: ${source}, user: ${userId})`
    );

    const jobData: ContactSyncJobData = {
      contactIds,
      userId,
      source,
    };

    const job = await this.queue.add(
      TYPESENSE_SYNC_QUEUE_JOBS.CONTACT_SYNC,
      jobData,
      {
        ...TYPESENSE_SYNC_QUEUE_CONFIG.defaultJobOptions,
      }
    );

    this.logger.log(
      `Typesense sync job queued with ID: ${job.id} for ${contactIds.length} contacts`
    );

    return job.id || "";
  }

  async enqueueApolloCacheSync(
    documents: ApolloCacheDocument[]
  ): Promise<string> {
    this.logger.log(
      `Queueing apollo cache sync for ${documents.length} documents`
    );

    const jobData: ApolloCacheSyncJobData = {
      documents,
    };

    const job = await this.queue.add(
      TYPESENSE_SYNC_QUEUE_JOBS.APOLLO_CACHE_SYNC,
      jobData,
      {
        ...TYPESENSE_SYNC_QUEUE_CONFIG.defaultJobOptions,
      }
    );

    this.logger.log(
      `Apollo cache sync job queued with ID: ${job.id} for ${documents.length} documents`
    );

    return job.id || "";
  }
}
