import { Module, Global } from "@nestjs/common";
import { redisProvider, RedisService } from "./redis.provider";

/**
 * Global Redis module that provides a singleton Redis connection.
 * This module should be imported in both AppModule and WorkerModule
 * to ensure all BullMQ instances share the same Redis connection.
 */
@Global()
@Module({
  providers: [redisProvider, RedisService],
  exports: [redisProvider, RedisService],
})
export class RedisModule {}

// Re-export REDIS_TOKEN for convenience (used for injection)
export { REDIS_TOKEN } from "./redis.provider";
