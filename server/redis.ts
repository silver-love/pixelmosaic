import { Redis } from "ioredis";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on("error", (err: Error) => {
      console.error("Redis connection error:", err.message);
    });

    redisClient.on("connect", () => {
      console.log("Connected to Redis");
    });
  }

  return redisClient;
}

export async function cacheMosaicResult(
  img1Hash: string,
  img2Hash: string,
  blockSize: number,
  dataUrl: string
): Promise<void> {
  const redis = getRedisClient();
  const key = `mosaic:${img1Hash}:${img2Hash}:${blockSize}`;
  await redis.setex(key, 3600, dataUrl);
}

export async function getCachedMosaicResult(
  img1Hash: string,
  img2Hash: string,
  blockSize: number
): Promise<string | null> {
  const redis = getRedisClient();
  const key = `mosaic:${img1Hash}:${img2Hash}:${blockSize}`;
  return redis.get(key);
}

export async function addHistoryEntry(
  sessionId: string,
  entry: string
): Promise<void> {
  const redis = getRedisClient();
  const key = `history:${sessionId}`;
  await redis.lpush(key, entry);
  await redis.ltrim(key, 0, 9);
}

export async function getHistory(sessionId: string): Promise<string[]> {
  const redis = getRedisClient();
  const key = `history:${sessionId}`;
  return redis.lrange(key, 0, -1);
}

export async function deleteHistoryEntry(
  sessionId: string,
  index: number
): Promise<void> {
  const redis = getRedisClient();
  const key = `history:${sessionId}`;
  const sentinel = "__DELETED__";
  await redis.lset(key, index, sentinel);
  await redis.lrem(key, 0, sentinel);
}