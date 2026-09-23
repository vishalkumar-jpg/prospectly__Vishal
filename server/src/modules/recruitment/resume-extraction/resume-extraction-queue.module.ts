import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ResumeExtractionQueueService } from "./resume-extraction-queue.service";
import {
  RESUME_EXTRACTION_QUEUE_NAME,
  RESUME_EXTRACTION_QUEUE_CONFIG,
} from "./resume-extraction.constants";

@Module({
  imports: [
    BullModule.registerQueue({
      name: RESUME_EXTRACTION_QUEUE_NAME,
      defaultJobOptions: RESUME_EXTRACTION_QUEUE_CONFIG.defaultJobOptions,
    }),
  ],
  providers: [ResumeExtractionQueueService],
  exports: [ResumeExtractionQueueService],
})
export class ResumeExtractionQueueModule {}
