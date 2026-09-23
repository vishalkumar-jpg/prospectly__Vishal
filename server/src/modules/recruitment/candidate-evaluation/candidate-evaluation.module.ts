import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseModule } from "database/database.module";
import { CandidateEvaluationService } from "./services/candidate-evaluation.service";
import { ResumeTextService } from "./services/resume-text.service";
import { CandidateEvaluationQueryRepository } from "./services/candidate-evaluation-query.repository";
import { CandidateEvaluationMutationRepository } from "./services/candidate-evaluation-mutation.repository";
import { CandidateEvaluationRetryService } from "./services/candidate-evaluation-retry.service";
import { CandidateEvaluationQueueService } from "./candidate-evaluation-queue.service";
import {
  CANDIDATE_EVALUATION_QUEUE_NAME,
  CANDIDATE_EVALUATION_QUEUE_CONFIG,
} from "./candidate-evaluation.constants";
import { JobExtractionModule } from "../job-extraction/job-extraction.module";
import { ResumeExtractionModule } from "../resume-extraction/resume-extraction.module";

@Module({
  imports: [
    DatabaseModule,
    JobExtractionModule,
    ResumeExtractionModule,
    BullModule.registerQueue({
      name: CANDIDATE_EVALUATION_QUEUE_NAME,
      defaultJobOptions: CANDIDATE_EVALUATION_QUEUE_CONFIG.defaultJobOptions,
    }),
  ],
  providers: [
    CandidateEvaluationService,
    ResumeTextService,
    CandidateEvaluationQueryRepository,
    CandidateEvaluationMutationRepository,
    CandidateEvaluationRetryService,
    CandidateEvaluationQueueService,
  ],
  exports: [
    CandidateEvaluationService,
    ResumeTextService,
    CandidateEvaluationQueryRepository,
    CandidateEvaluationMutationRepository,
    CandidateEvaluationRetryService,
    CandidateEvaluationQueueService,
  ],
})
export class CandidateEvaluationModule {}
