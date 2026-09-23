import { Module } from "@nestjs/common";
import { MediaModule } from "modules/media/media.module";
import { SharedModule } from "shared/shared.module";
import { ConnectorPipelineController } from "./connector-pipeline.controller";
import {
  ConnectorPipelineService,
  ConnectorPipelineCandidatesService,
  ConnectorPipelineCandidateDetailService,
  ConnectorPipelineCandidateResumeService,
  ConnectorPipelinePoolDetailService,
} from "./services";
import { RecruitmentFeeConfigModule } from "../fee-config/recruitment-fee-config.module";
import { JobPoolMatchesModule } from "../job-pool-matches/job-pool-matches.module";
import { ResumeSearchModule } from "../resume-search/resume-search.module";

@Module({
  imports: [
    RecruitmentFeeConfigModule,
    JobPoolMatchesModule,
    MediaModule,
    SharedModule,
    ResumeSearchModule,
  ],
  controllers: [ConnectorPipelineController],
  providers: [
    ConnectorPipelineService,
    ConnectorPipelineCandidatesService,
    ConnectorPipelineCandidateDetailService,
    ConnectorPipelineCandidateResumeService,
    ConnectorPipelinePoolDetailService,
  ],
})
export class ConnectorPipelineModule {}
