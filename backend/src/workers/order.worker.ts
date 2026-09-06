import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { enqueueShipmentSchedule } from "../queues/index.js";
import { logger } from "../lib/logger.js";

export const orderWorker = new Worker("orders", async (job) => {
  if (job.name === "order:paid") await enqueueShipmentSchedule(job.data.orderId as string);
}, { connection: redis });

orderWorker.on("failed", (job, error) => logger.error({ jobId: job?.id, err: error }, "Order job failed"));