import type { ConnectionOptions } from "bullmq";
import type Redis from "ioredis";
import { getOsEnvOptional } from "./env.config";

const redisPassword = getOsEnvOptional("REDIS_PASSWORD") ?? "";

export const redisConfig = {
  port: +(getOsEnvOptional("REDIS_PORT") ?? 6379),
  host: getOsEnvOptional("REDIS_HOST") ?? "localhost",
  password: redisPassword,
  username: getOsEnvOptional("REDIS_USERNAME") ?? "default",
  tls:
    getOsEnvOptional("REDIS_TLS") === "true" ||
    getOsEnvOptional("REDIS_TLS") === "1",
};

/**
 * Creates a shared Redis connection configuration for BullMQ
 * with connection pooling to prevent connection exhaustion.
 *
 * @deprecated Use the shared Redis instance from RedisModule instead.
 * This function is kept for backward compatibility but should not be used
 * in new code. Inject REDIS_TOKEN and pass the Redis instance directly to BullMQ.
 *
 * Key settings:
 * - maxRetriesPerRequest: null - Prevents connection leaks in queue workers
 * - enableReadyCheck: true - Ensures connections are valid before use
 * - connectTimeout: Prevents hanging connections
 * - keepAlive: Maintains connections to reduce overhead
 */
export function createBullMQConnection(): ConnectionOptions {
  return {
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
  };
}

/**
 * Determines if queue functionality should be enabled.
 *
 * Priority:
 * 1. If ENABLE_QUEUES is explicitly set, use that value
 * 2. Otherwise, enable queues if REDIS_HOST is configured (including localhost)
 *
 * This allows developers to:
 * - Explicitly enable queues: ENABLE_QUEUES=true
 * - Explicitly disable queues: ENABLE_QUEUES=false
 * - Test locally with Redis on localhost without restrictions
 */
export function isQueuesEnabled(): boolean {
  const enableQueues = getOsEnvOptional("ENABLE_QUEUES");
  if (enableQueues !== undefined) {
    return enableQueues === "true" || enableQueues === "1";
  }
  // Default: enable if REDIS_HOST is configured (allow localhost)
  return !!redisConfig.host;
}

/**
 * Helper type for BullMQ connection configuration.
 * BullMQ accepts either ConnectionOptions or a Redis instance.
 */
export type BullMQConnection = ConnectionOptions | Redis;
