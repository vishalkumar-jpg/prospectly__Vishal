import { Module } from "@nestjs/common";
import { DatabaseModule } from "database/database.module";
import { SharedModule } from "shared/shared.module";
import { ResumeIndexingQueueModule } from "./resume-indexing-queue.module";
import { ResumePdfTextService } from "./services/resume-pdf-text.service";
import { ResumeIndexingQueryRepository } from "./services/resume-indexing-query.repository";
import { ResumeIndexingMutationRepository } from "./services/resume-indexing-mutation.repository";
import { ResumeIndexingRunnerService } from "./services/resume-indexing-runner.service";
import { ResumeIndexingBackfillService } from "./services/resume-indexing-backfill.service";
import { ResumeFacetRollupService } from "./services/resume-facet-rollup.service";
import { CandidateEvaluationModule } from "../candidate-evaluation/candidate-evaluation.module";
import { EmbeddingModule } from "../job-pool-matches/embedding.module";

@Module({
  imports: [
    DatabaseModule,
    SharedModule,
    EmbeddingModule,
    CandidateEvaluationModule,
    ResumeIndexingQueueModule,
  ],
  providers: [
    ResumePdfTextService,
    ResumeIndexingQueryRepository,
    ResumeIndexingMutationRepository,
    ResumeIndexingRunnerService,
    ResumeIndexingBackfillService,
    ResumeFacetRollupService,
  ],
  exports: [
    ResumeIndexingRunnerService,
    ResumeIndexingBackfillService,
    ResumeIndexingMutationRepository,
    ResumeFacetRollupService,
  ],
})
export class ResumeIndexingModule {}
