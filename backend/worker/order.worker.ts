import { Worker } from "bullmq";
import { redis } from "../src/config/redis.js";
import { shipmentQueue } from "../src/queues/index.js";
import { logger } from "../src/lib/logger.js";

export const orderWorker = new Worker("orders", async (job) => {
  if (job.name === "order:paid") await shipmentQueue.add("shipment:schedule", job.data);
}, { connection: redis });

orderWorker.on("failed", (job, error) => logger.error({ jobId: job?.id, err: error }, "Order job failed"));