import { Module } from "@nestjs/common";
import { CandidateConnectorsService } from "./candidate-connectors.service";
import { RecruitmentFeeConfigModule } from "../fee-config/recruitment-fee-config.module";

// Mapping table helpers for recruitment_candidate_connectors. No controller —
// this module exists purely to make the service injectable into other
// recruitment modules (candidates, consent, payout).
@Module({
  imports: [RecruitmentFeeConfigModule],
  providers: [CandidateConnectorsService],
  exports: [CandidateConnectorsService],
})
export class CandidateConnectorsModule {}
