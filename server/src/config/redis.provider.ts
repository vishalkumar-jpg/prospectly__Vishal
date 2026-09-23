import { Provider, Logger, OnModuleDestroy, Inject } from "@nestjs/common";
import Redis from "ioredis";
import { redisConfig } from "./redis-config";

export const REDIS_TOKEN = "REDIS_CLIENT";

const logger = new Logger("RedisProvider");

/**
 * Singleton Redis client provider.
 * This ensures all BullMQ instances share the same Redis connection,
 * preventing connection exhaustion.
 */
export const redisProvider: Provider<Redis> = {
  provide: REDIS_TOKEN,
  useFactory: (): Redis => {
    const redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      username: redisConfig.username,
      tls: redisConfig.tls ? {} : undefined,
      // Critical: Disable retry limit to prevent connection leaks
      maxRetriesPerRequest: null,
      // Enable ready check to ensure connection is valid
      enableReadyCheck: true,
      // Connection timeout to prevent hanging connections
      connectTimeout: 10000,
      // Enable keep-alive to maintain connections (in milliseconds)
      keepAlive: 30000,
      // Retry strategy with exponential backoff
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      // Enable offline queue to handle reconnections gracefully
      enableOfflineQueue: true,
      // Lazy connect - don't connect immediately
      lazyConnect: false,
    });

    redis.on("connect", () => {
      logger.log("Redis client connected");
    });

    redis.on("ready", () => {
      logger.log("Redis client ready");
    });

    redis.on("error", (error) => {
      logger.error(`Redis client error: ${error.message}`, error.stack);
    });

    redis.on("close", () => {
      logger.warn("Redis client connection closed");
    });

    redis.on("reconnecting", () => {
      logger.log("Redis client reconnecting...");
    });

    return redis;
  },
};

/**
 * Service to handle Redis connection lifecycle and cleanup
 */
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_TOKEN) private readonly redis: Redis) {}

  async onModuleDestroy() {
    this.logger.log("Closing Redis connection...");
    try {
      await this.redis.quit();
      this.logger.log("Redis connection closed");
    } catch (error) {
      this.logger.error(`Error closing Redis connection: ${error.message}`);
    }
  }
}
