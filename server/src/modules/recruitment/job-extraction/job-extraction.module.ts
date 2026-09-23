import { Module } from "@nestjs/common";
import { AiUsageModule } from "modules/ai-usage/ai-usage.module";
import { JobExtractionController } from "./job-extraction.controller";
import {
  JobExtractionGeminiService,
  JobExtractionGenerationService,
  JobExtractionParserService,
  JobPageService,
} from "./services";
import { JobExtractionGeminiClientUtil } from "./utils/job-extraction-gemini-client.util";
import { JobExtractionService } from "./job-extraction.service";

@Module({
  imports: [AiUsageModule],
  controllers: [JobExtractionController],
  providers: [
    JobExtractionService,
    JobPageService,
    JobExtractionGeminiService,
    JobExtractionGenerationService,
    JobExtractionParserService,
    JobExtractionGeminiClientUtil,
  ],
  // JobExtractionService is exported so candidate search can reuse this
  // extractor rather than growing a second one with its own prompt.
  exports: [JobExtractionGeminiService, JobExtractionService],
})
export class JobExtractionModule {}
