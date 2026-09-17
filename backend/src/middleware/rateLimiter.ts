import type { NextFunction, Request, Response } from "express";
import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import { redis } from "../config/redis.js";

// ─── Factory ────────────────────────────────────────────────────────────────
function createLimiter(opts: { points: number; duration: number; keyPrefix: string }) {
  return new RateLimiterRedis({ storeClient: redis, ...opts });
}

// ─── Limiters ────────────────────────────────────────────────────────────────
const globalLimiter = createLimiter({ points: 200, duration: 900, keyPrefix: "rl:global" });
const authLimiter   = createLimiter({ points: 10,  duration: 60,  keyPrefix: "rl:auth"   });
const otpLimiter    = createLimiter({ points: 5,   duration: 300, keyPrefix: "rl:otp"    });

// ─── Middleware factory ───────────────────────────────────────────────────────
function makeMiddleware(limiter: RateLimiterRedis) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    limiter
      .consume(key)
      .then(() => next())
      .catch((rateLimiterRes: RateLimiterRes) => {
        const retrySecs = Math.ceil(rateLimiterRes.msBeforeNext / 1000);
        res.setHeader("Retry-After", String(retrySecs));
        res.status(429).json({
          success: false,
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
          retryAfter: retrySecs,
        });
      });
  };
}

export const redisRateLimiter = makeMiddleware(globalLimiter);
export const authRateLimiter  = makeMiddleware(authLimiter);
export const otpRateLimiter   = makeMiddleware(otpLimiter);