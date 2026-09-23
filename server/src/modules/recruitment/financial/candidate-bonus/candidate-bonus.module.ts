import { Module } from "@nestjs/common";
import { CandidateBonusController } from "./candidate-bonus.controller";
import { CandidateBonusService } from "./candidate-bonus.service";

@Module({
  controllers: [CandidateBonusController],
  providers: [CandidateBonusService],
})
export class CandidateBonusModule {}
