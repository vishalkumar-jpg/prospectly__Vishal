import { Module } from "@nestjs/common";
import { RecruitmentJobsModule } from "./jobs/recruitment-jobs.module";
import { MasterDataModule } from "./master-data/master-data.module";
import { InterviewCostModule } from "./interview-cost/interview-cost.module";
import { MarketplaceModule } from "./marketplace/marketplace.module";
import { RecruitmentJobShareModule } from "./share/share.module";
import { CandidatesModule } from "./candidates/candidates.module";
import { CandidateSearchModule } from "./candidate-search/candidate-search.module";
import { ResumeSearchModule } from "./resume-search/resume-search.module";
import { MyApplicationsModule } from "./my-applications/my-applications.module";
import { JobPoolMatchesModule } from "./job-pool-matches/job-pool-matches.module";
import { ConsentModule } from "./consent";
import { ConnectorPipelineModule } from "./connector-pipeline/connector-pipeline.module";
import { CandidateWorkflowModule } from "./candidate-workflow/candidate-workflow.module";
import { InterviewBookingModule } from "./interview-booking/interview-booking.module";
import { JobExtractionModule } from "./job-extraction/job-extraction.module";
import { RecruitmentPayoutModule } from "./payout/recruitment-payout.module";
import { RecruitmentPayoutSplitModule } from "./payout/recruitment-payout-split.module";
import { RecruitmentPayoutQueueModule } from "./payout-queue/recruitment-payout-queue.module";
import { ConnectorUploadModule } from "./connector-upload/connector-upload.module";
import { ConnectorOriginsModule } from "./connector-origins/connector-origins.module";
import { CandidateConnectorsModule } from "./candidate-connectors/candidate-connectors.module";
import { RequesterSpendingModule } from "./financial/requester-spending/requester-spending.module";
import { ConnectorEarningModule } from "./financial/connector-earning/connector-earning.module";
import { CandidateBonusModule } from "./financial/candidate-bonus/candidate-bonus.module";
import { RecruitmentNotificationsModule } from "./notifications/recruitment-notifications.module";
import { RecruitmentCollaborationModule } from "./collaboration/recruitment-collaboration.module";
import { RecruitmentAssessmentBankModule } from "./assessment-bank/recruitment-assessment-bank.module";
import { RecruiterDashboardModule } from "./recruiter-dashboard/recruiter-dashboard.module";
import { RecruitmentEmailLogsApiModule } from "./email-logs/recruitment-email-logs-api.module";

@Module({
  imports: [
    RecruitmentCollaborationModule,
    RecruitmentEmailLogsApiModule,
    RecruitmentJobsModule,
    RecruitmentAssessmentBankModule,
    RecruitmentNotificationsModule,
    RecruiterDashboardModule,
    MasterDataModule,
    InterviewCostModule,
    MarketplaceModule,
    RecruitmentJobShareModule,
    CandidatesModule,
    ResumeSearchModule,
    CandidateSearchModule,
    MyApplicationsModule,
    JobPoolMatchesModule,
    ConsentModule,
    ConnectorPipelineModule,
    CandidateWorkflowModule,
    InterviewBookingModule,
    JobExtractionModule,
    RecruitmentPayoutModule,
    RecruitmentPayoutSplitModule,
    RecruitmentPayoutQueueModule,
    ConnectorUploadModule,
    ConnectorOriginsModule,
    CandidateConnectorsModule,
    RequesterSpendingModule,
    ConnectorEarningModule,
    CandidateBonusModule,
  ],
})
export class RecruitmentModule {}
