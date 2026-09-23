import { Module } from "@nestjs/common";
import { RecruitmentFeeConfigModule } from "modules/recruitment/fee-config/recruitment-fee-config.module";
import { ConnectorEarningController } from "./connector-earning.controller";
import { ConnectorEarningService } from "./connector-earning.service";
import { EarningListService } from "./services/earning-list.service";
import { EarningStatsService } from "./services/earning-stats.service";
import { EarningDetailService } from "./services/earning-detail.service";

@Module({
  imports: [RecruitmentFeeConfigModule],
  controllers: [ConnectorEarningController],
  providers: [
    ConnectorEarningService,
    EarningListService,
    EarningStatsService,
    EarningDetailService,
  ],
})
export class ConnectorEarningModule {}
