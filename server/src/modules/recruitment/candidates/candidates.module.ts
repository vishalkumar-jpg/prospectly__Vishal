import { Module } from "@nestjs/common";
import { MediaModule } from "modules/media/media.module";
import { ResumeExtractionQueueModule } from "modules/recruitment/resume-extraction/resume-extraction-queue.module";
import { CandidateEvaluationModule } from "modules/recruitment/candidate-evaluation/candidate-evaluation.module";
import { CandidateConnectorsModule } from "modules/recruitment/candidate-connectors/candidate-connectors.module";
import { RecruitmentCollaborationModule } from "modules/recruitment/collaboration/recruitment-collaboration.module";
import { CandidatesController } from "./candidates.controller";
import {
  CandidatesMutationService,
  CandidatesCheckApplicationService,
  CandidatesListService,
  CandidatesDetailService,
  CandidatesResumeService,
  CandidatesContactService,
} from "./services";

@Module({
  imports: [
    MediaModule,
    ResumeExtractionQueueModule,
    CandidateEvaluationModule,
    CandidateConnectorsModule,
    RecruitmentCollaborationModule,
  ],
  controllers: [CandidatesController],
  providers: [
    CandidatesMutationService,
    CandidatesCheckApplicationService,
    CandidatesListService,
    CandidatesDetailService,
    CandidatesResumeService,
    CandidatesContactService,
  ],
})
export class CandidatesModule {}
