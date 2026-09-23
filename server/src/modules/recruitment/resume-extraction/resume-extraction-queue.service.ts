import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  RESUME_EXTRACTION_QUEUE_NAME,
  RESUME_EXTRACTION_QUEUE_JOBS,
} from "./resume-extraction.constants";

export interface ResumeExtractionJobPayload {
  mediaId: string;
  candidateId: string;
  contactId?: number;
  jobId: string;
  userId: string;
}

@Injectable()
export class ResumeExtractionQueueService {
  private readonly logger = new Logger(ResumeExtractionQueueService.name);

  constructor(
    @InjectQueue(RESUME_EXTRACTION_QUEUE_NAME)
    private readonly queue: Queue
  ) {}

  async queueExtraction(payload: ResumeExtractionJobPayload): Promise<void> {
    await this.queue.add(RESUME_EXTRACTION_QUEUE_JOBS.EXTRACT, payload, {
      jobId: `resume-${payload.mediaId}-${Date.now()}`,
    });
    this.logger.log(`Queued resume extraction for media ${payload.mediaId}`);
  }
}
