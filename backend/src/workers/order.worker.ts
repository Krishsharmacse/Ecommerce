import { Worker } from "bullmq";
import { redis } from "../config/redis.js";
import { logger } from "../lib/logger.js";
import { wsPublish } from "../lib/ws.js";
import { prisma } from "../lib/prisma.js";
import { enqueueShipmentSchedule } from "../modules/queues/index.js";

export const orderWorker = new Worker(
  "orders",
  async (job) => {
    if (job.name !== "order:paid") return;

    const orderId = job.data.orderId as string;

    // 1. Schedule shipment
    await enqueueShipmentSchedule(orderId);

    // 2. Push real-time WebSocket event to the customer
    try {
      const order = await prisma.order.findUnique({
        where:  { id: orderId },
        select: { userId: true, status: true, totalPaise: true },
      });
      if (order) {
        wsPublish(order.userId, "order.confirmed", {
          orderId,
          status:      order.status,
          totalPaise:  order.totalPaise,
        });
      }
    } catch (err) {
      // WS failure must never block queue processing
      logger.warn({ err, orderId }, "orderWorker: wsPublish failed");
    }

    logger.info({ jobId: job.id, orderId }, "Order paid processed");
  },
  { connection: redis }
);

orderWorker.on("failed", (job, error) =>
  logger.error({ jobId: job?.id, err: error }, "Order job failed")
);
