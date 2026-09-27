import http from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { createWsServer } from "./lib/ws.js";

const httpServer = http.createServer(app);
const wss = createWsServer(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "ShopVault API + WebSocket server started");
});

// Auto-start BullMQ workers unless running in standalone worker process
if (process.env.RUN_WORKERS !== "false") {
  import("./workers/index.js").catch((err) => {
    logger.error({ err }, "Failed to start BullMQ workers in server process");
  });
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown(signal: string) {
  logger.info({ signal }, "Shutdown signal received, closing gracefully...");
  wss.close(() => logger.info("WebSocket server closed"));
  httpServer.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));