import { Module } from "@nestjs/common";
import { DatabaseModule } from "database/database.module";
import { AiUsageModule } from "modules/ai-usage/ai-usage.module";
import { SharedModule } from "shared/shared.module";
import { BullModule } from "@nestjs/bullmq";
import { JobPoolMatchesController } from "./job-pool-matches.controller";
import {
  JobPoolMatchesComputeService,
  JobPoolMatchesActiveQueryService,
  JobPoolMatchesClosedQueryService,
  JobPoolMatchesClosedReferredService,
  JobPoolMatchesMutationService,
  JobPoolMatchesResumeService,
  LlmScoringService,
} from "./services";
import { EmbeddingModule } from "./embedding.module";
import { JobPoolMatchQueueService } from "./job-pool-match-queue.service";
import {
  JOB_POOL_MATCH_QUEUE_NAME,
  JOB_POOL_MATCH_QUEUE_CONFIG,
} from "./job-pool-matches.constants";
import { RecruitmentFeeConfigModule } from "../fee-config/recruitment-fee-config.module";

@Module({
  imports: [
    DatabaseModule,
    SharedModule,
    AiUsageModule,
    RecruitmentFeeConfigModule,
    EmbeddingModule,
    BullModule.registerQueue({
      name: JOB_POOL_MATCH_QUEUE_NAME,
      defaultJobOptions: JOB_POOL_MATCH_QUEUE_CONFIG.defaultJobOptions,
    }),
  ],
  controllers: [JobPoolMatchesController],
  providers: [
    LlmScoringService,
    JobPoolMatchesComputeService,
    JobPoolMatchesActiveQueryService,
    JobPoolMatchesClosedReferredService,
    JobPoolMatchesClosedQueryService,
    JobPoolMatchesMutationService,
    JobPoolMatchesResumeService,
    JobPoolMatchQueueService,
  ],
  exports: [
    JobPoolMatchQueueService,
    JobPoolMatchesComputeService,
    JobPoolMatchesActiveQueryService,
    EmbeddingModule,
  ],
})
export class JobPoolMatchesModule {}
