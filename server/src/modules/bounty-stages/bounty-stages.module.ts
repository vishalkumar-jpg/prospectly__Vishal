import { Module } from "@nestjs/common";
import { BountyStagesController } from "./bounty-stages.controller";
import { BountyStagesService } from "./bounty-stages.service";

@Module({
  controllers: [BountyStagesController],
  providers: [BountyStagesService],
  exports: [BountyStagesService],
})
export class BountyStagesModule {}
