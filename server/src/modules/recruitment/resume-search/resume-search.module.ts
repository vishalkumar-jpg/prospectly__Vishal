import { Module } from "@nestjs/common";
import { DatabaseModule } from "database/database.module";
import { AiUsageModule } from "modules/ai-usage/ai-usage.module";
import { ResumeSearchController } from "./resume-search.controller";
import {
  ResumeSearchService,
  ResumeSearchEmbeddingService,
  ResumeSearchQueryPlannerService,
  ResumeSearchHybridRepository,
} from "./services";

/** RedisModule is @Global, so the query-embedding cache needs no import here. */
@Module({
  imports: [DatabaseModule, AiUsageModule],
  controllers: [ResumeSearchController],
  providers: [
    ResumeSearchService,
    ResumeSearchEmbeddingService,
    ResumeSearchQueryPlannerService,
    ResumeSearchHybridRepository,
  ],
  // The connector pipeline exposes its own connector-scoped route over the same
  // service — see ResumeSearchScope.
  // The hybrid repository and the embedding service are exported so cross-job
  // candidate search can rank with the same machinery rather than growing a
  // second retrieval path (ADR-005 §2).
  exports: [
    ResumeSearchService,
    ResumeSearchHybridRepository,
    ResumeSearchEmbeddingService,
    // Cross-job search plans its free text with the same prompt the board uses,
    // so "backend" means the same thing in both places.
    ResumeSearchQueryPlannerService,
  ],
})
export class ResumeSearchModule {}
