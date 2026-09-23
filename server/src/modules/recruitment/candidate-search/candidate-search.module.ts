import { Module } from "@nestjs/common";
import { DatabaseModule } from "database/database.module";
import { AiUsageModule } from "modules/ai-usage/ai-usage.module";
import { JobExtractionModule } from "modules/recruitment/job-extraction/job-extraction.module";
import { ResumeSearchModule } from "modules/recruitment/resume-search/resume-search.module";
import { CandidateSearchController } from "./candidate-search.controller";
import {
  CandidateSearchService,
  CandidateSearchScopeService,
  CandidateSearchFacetsService,
  CandidateSearchJdService,
  CandidateSearchRankingService,
  CandidateSearchQueryIntentService,
  CandidateSearchSavedService,
  CandidateSearchRepository,
} from "./services";

/**
 * `/count` has no service of its own: it resolves the same scope and runs the
 * same filters as `/search`, so splitting it would duplicate that wiring to save
 * three lines. It lives on `CandidateSearchService` as `count()`.
 */
@Module({
  // ResumeSearchModule supplies the hybrid repository and embedding service:
  // cross-job search ranks with the same machinery rather than growing a second
  // retrieval path.
  imports: [
    DatabaseModule,
    ResumeSearchModule,
    JobExtractionModule,
    AiUsageModule,
  ],
  controllers: [CandidateSearchController],
  providers: [
    CandidateSearchService,
    CandidateSearchScopeService,
    CandidateSearchFacetsService,
    CandidateSearchJdService,
    CandidateSearchRankingService,
    CandidateSearchQueryIntentService,
    CandidateSearchSavedService,
    CandidateSearchRepository,
  ],
})
export class CandidateSearchModule {}
