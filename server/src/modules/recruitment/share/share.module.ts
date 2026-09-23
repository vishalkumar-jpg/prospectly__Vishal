import { Module } from "@nestjs/common";
import { RecruitmentJobShareController } from "./share.controller";
import { RecruitmentJobShareService } from "./share.service";
import { RecruitmentFeeConfigModule } from "../fee-config/recruitment-fee-config.module";

@Module({
  imports: [RecruitmentFeeConfigModule],
  controllers: [RecruitmentJobShareController],
  providers: [RecruitmentJobShareService],
  exports: [RecruitmentJobShareService],
})
export class RecruitmentJobShareModule {}
