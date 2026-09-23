import { Module } from "@nestjs/common";
import { DatabaseModule } from "database/database.module";
import { AiUsageLoggerService } from "services/ai-usage-logger.service";

@Module({
  imports: [DatabaseModule],
  providers: [AiUsageLoggerService],
  exports: [AiUsageLoggerService],
})
export class AiUsageModule {}
