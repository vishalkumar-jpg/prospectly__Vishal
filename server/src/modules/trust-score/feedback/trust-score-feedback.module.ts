import { Module } from "@nestjs/common";
import { DatabaseModule } from "database/database.module";
import { TrustScoreFeedbackController } from "./trust-score-feedback.controller";
import { TrustScoreFeedbackService } from "./trust-score-feedback.service";

@Module({
  imports: [DatabaseModule],
  controllers: [TrustScoreFeedbackController],
  providers: [TrustScoreFeedbackService],
  exports: [TrustScoreFeedbackService],
})
export class TrustScoreFeedbackModule {}
