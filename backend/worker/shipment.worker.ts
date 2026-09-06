import { Worker } from "bullmq";
import { redis } from "../src/config/redis.js";
import { ShipmentService } from "../src/modules/shipments/shipment.service.js";
import { logger } from "../src/lib/logger.js";

const shipmentService = new ShipmentService();

export const shipmentWorker = new Worker("shipments", async (job) => {
  if (job.name === "shipment:schedule") await shipmentService.schedule(job.data.orderId as string);
}, { connection: redis });

shipmentWorker.on("failed", (job, error) => logger.error({ jobId: job?.id, err: error }, "Shipment job failed"));