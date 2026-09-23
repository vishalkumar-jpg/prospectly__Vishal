import { Module } from "@nestjs/common";
import { RecruitmentAssessmentBankController } from "./recruitment-assessment-bank.controller";
import { RecruitmentAssessmentBankService } from "./recruitment-assessment-bank.service";

@Module({
  controllers: [RecruitmentAssessmentBankController],
  providers: [RecruitmentAssessmentBankService],
  exports: [RecruitmentAssessmentBankService],
})
export class RecruitmentAssessmentBankModule {}
