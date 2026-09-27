import type { CorsOptions } from "cors";
import { env } from "./env.js";

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow mobile apps, curl, server-to-server without origin
    if (!origin) return callback(null, true);

    const allowed = env.CORS_ORIGINS.split(",").map((o) => o.trim());
    if (allowed.includes("*") || allowed.includes(origin)) {
      return callback(null, true);
    }
    // Automatically permit Vercel preview and production deployments
    if (origin.endsWith(".vercel.app") || origin.includes("localhost")) {
      return callback(null, true);
    }
    return callback(new Error(`CORS origin not allowed: ${origin}`), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Request-Id"]
};