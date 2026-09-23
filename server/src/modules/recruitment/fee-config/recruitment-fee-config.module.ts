import { Module } from "@nestjs/common";
import { RecruitmentFeeConfigService } from "./recruitment-fee-config.service";

@Module({
  providers: [RecruitmentFeeConfigService],
  exports: [RecruitmentFeeConfigService],
})
export class RecruitmentFeeConfigModule {}
