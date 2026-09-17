import express from "express";
import cors from "cors";
import helmet from "helmet";
// pino-http uses module.exports which requires ESM interop
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const pinoHttp: (opts: Record<string, unknown>) => import("express").RequestHandler = require("pino-http");
import { corsOptions } from "./config/cors.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./config/redis.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { requestId } from "./middleware/requestId.js";
import { redisRateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { apiRoutes } from "./routes/index.js";

export const app = express();

// ─── Trust proxy (required when behind Vercel / Nginx / Railway) ──────────────
app.set("trust proxy", 1);

// ─── Request ID (must be first so all subsequent middleware can read it) ───────
app.use(requestId);

// ─── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    // API-only server: no need to serve frames or scripts
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-origin" },
    referrerPolicy:             { policy: "no-referrer" },
    xContentTypeOptions:        true,
  })
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors(corsOptions));

// ─── HTTP request logger (structured pino) ────────────────────────────────────
const httpLogger = pinoHttp({
  logger,
  genReqId: (req: import("express").Request) => req.requestId ?? "unknown",
  autoLogging: { ignore: (req: import("express").Request) => req.url === "/health" },
});
app.use(httpLogger);

// ─── Body parsing ──────────────────────────────────────────────────────────────
// Webhook must receive raw bytes — mount BEFORE express.json()
app.use("/api/v1/payments/webhook", express.raw({ type: "application/json", limit: "1mb" }));
app.use(express.json({ limit: "1mb" }));

// ─── Global rate limiter ───────────────────────────────────────────────────────
app.use(redisRateLimiter);

// ─── Health check ──────────────────────────────────────────────────────────────
app.get("/health", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({
      success:   true,
      status:    "healthy",
      timestamp: new Date().toISOString(),
      uptime:    Math.floor(process.uptime()),
    });
  } catch (error) {
    next(error);
  }
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use(env.API_PREFIX, apiRoutes);

// ─── 404 & Error handlers ─────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);