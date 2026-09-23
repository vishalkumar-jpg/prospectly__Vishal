import { Logger } from "@nestjs/common";
import { toUTC } from "utils/dayjs";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { appConfig } from "config/app.config";
import { WorkerModule } from "./worker/worker.module";

async function bootstrap() {
  const logger = new Logger("Worker");
  const app = await NestFactory.create(WorkerModule, {
    logger: appConfig.isProduction
      ? ["error"]
      : ["error", "warn", "log", "debug", "verbose"],
  });

  // Health check endpoint for worker
  app.getHttpAdapter().get("/worker/health", (req, res) => {
    res.json({
      status: "ok",
      type: "worker",
      timestamp: toUTC().toISOString(),
    });
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>("WORKER_PORT") || 5002;
  await app.listen(port, "0.0.0.0");

  process.on("SIGTERM", async () => {
    logger.log("SIGTERM received, shutting down worker gracefully...");
    await app.close();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    logger.log("SIGINT received, shutting down worker gracefully...");
    await app.close();
    process.exit(0);
  });

  logger.log(`Worker process running on port ${port}`);
  logger.log(`Worker health check: http://localhost:${port}/worker/health`);
  logger.log("Queue processors registered:");
  logger.log("  - PayoutQueueProcessor");
  logger.log("  - GoogleContactsQueueProcessor");
  logger.log("  - MicrosoftContactsQueueProcessor");
  logger.log("  - AppleContactsQueueProcessor");
  logger.log("Cron jobs scheduled:");
  logger.log("  - Auto-complete expired meetings (every 10 minutes)");
}

bootstrap();
