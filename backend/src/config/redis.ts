import { Redis } from "ioredis";
import { env } from "./env.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true
});

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    return value ? JSON.parse(value) as T : null;
  },
  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  },
  async delete(key: string): Promise<void> {
    await redis.del(key);
  }
};