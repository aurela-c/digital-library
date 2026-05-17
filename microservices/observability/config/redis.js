import Redis from "ioredis";

/**
 * Build an ioredis client from REDIS_URL or REDIS_HOST / REDIS_PORT.
 */
export function createRedisClient() {
  const url = process.env.REDIS_URL;
  if (url) {
    return new Redis(url, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });
  }

  return new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 2,
    lazyConnect: true,
  });
}
