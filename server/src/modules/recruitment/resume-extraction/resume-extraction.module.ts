import { Module } from "@nestjs/common";
import { ResumeExtractionAiService } from "./services/resume-extraction-ai.service";
import { ResumeExtractionLinkedinSyncService } from "./services/resume-extraction-linkedin-sync.service";
import { ResumeExtractionMutationService } from "./services/resume-extraction-mutation.service";
import { JobExtractionModule } from "../job-extraction/job-extraction.module";
import { ResumeIndexingQueueModule } from "../resume-indexing/resume-indexing-queue.module";

@Module({
  imports: [JobExtractionModule, ResumeIndexingQueueModule],
  providers: [
    ResumeExtractionAiService,
    ResumeExtractionMutationService,
    ResumeExtractionLinkedinSyncService,
  ],
  exports: [
    ResumeExtractionAiService,
    ResumeExtractionMutationService,
    ResumeExtractionLinkedinSyncService,
  ],
})
export class ResumeExtractionModule {}
