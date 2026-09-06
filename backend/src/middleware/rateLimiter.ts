import type { NextFunction, Request, Response } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { redis } from "../config/redis.js";

const globalLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:global",
  points: 200,
  duration: 900
});

export function redisRateLimiter(req: Request, res: Response, next: NextFunction): void {
  globalLimiter.consume(req.ip ?? "unknown").then(() => next()).catch(() => {
    res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
  });
}