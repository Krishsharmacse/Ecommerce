import express from "express";
import cors from "cors";
import helmet from "helmet";
import { corsOptions } from "./config/cors.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./config/redis.js";
import { env } from "./config/env.js";
import { redisRateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { apiRoutes } from "./routes/index.js";

export const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use("/api/v1/payments/webhook", express.raw({ type: "application/json", limit: "1mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(redisRateLimiter);

app.get("/health", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({ success: true, status: "healthy", timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

app.use(env.API_PREFIX, apiRoutes);
app.use(notFound);
app.use(errorHandler);