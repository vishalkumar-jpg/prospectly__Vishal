import { Module } from "@nestjs/common";
import { DatabaseModule } from "database/database.module";
import { TrustScoreController } from "./trust-score.controller";
import { TrustScoreService } from "./trust-score.service";
import { TrustScoreFeedbackModule } from "./feedback/trust-score-feedback.module";

@Module({
  imports: [DatabaseModule, TrustScoreFeedbackModule],
  controllers: [TrustScoreController],
  providers: [TrustScoreService],
  exports: [TrustScoreService],
})
export class TrustScoreModule {}
