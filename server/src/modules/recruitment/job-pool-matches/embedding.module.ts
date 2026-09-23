import { Module } from "@nestjs/common";
import { DatabaseModule } from "database/database.module";
import { AiUsageModule } from "modules/ai-usage/ai-usage.module";
import { EmbeddingService } from "./services/embedding.service";

/**
 * Standalone so consumers outside job-pool-matches (resume indexing) can inject
 * EmbeddingService without pulling in that module's queue and controller.
 */
@Module({
  imports: [DatabaseModule, AiUsageModule],
  providers: [EmbeddingService],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
