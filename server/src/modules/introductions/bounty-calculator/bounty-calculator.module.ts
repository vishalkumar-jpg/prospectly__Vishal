import { Module } from "@nestjs/common";
import { AiUsageModule } from "modules/ai-usage/ai-usage.module";
import { BountyCalculatorController } from "./bounty-calculator.controller";
import { BountyCalculatorService } from "./bounty-calculator.service";
import { BountyDbUpdaterService } from "./bounty-db-updater.service";
import { BountyTypesenseSyncService } from "./bounty-typesense-sync.service";

@Module({
  imports: [AiUsageModule],
  controllers: [BountyCalculatorController],
  providers: [
    BountyCalculatorService,
    BountyDbUpdaterService,
    BountyTypesenseSyncService,
  ],
  exports: [BountyCalculatorService],
})
export class BountyCalculatorModule {}
