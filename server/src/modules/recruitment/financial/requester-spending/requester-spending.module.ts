import { Module } from "@nestjs/common";
import { RequesterSpendingController } from "./requester-spending.controller";
import { RequesterSpendingService } from "./requester-spending.service";
import { SpendingListService } from "./services/spending-list.service";
import { SpendingStatsService } from "./services/spending-stats.service";
import { SpendingDetailService } from "./services/spending-detail.service";

@Module({
  controllers: [RequesterSpendingController],
  providers: [
    RequesterSpendingService,
    SpendingListService,
    SpendingStatsService,
    SpendingDetailService,
  ],
})
export class RequesterSpendingModule {}
