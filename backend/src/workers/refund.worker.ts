import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import { RefundService } from "../modules/payments/refund.service.js";

const refundService = new RefundService();

export const refundWorker = new Worker("refunds", async (job) => {
  if (job.name === "refund:process") await refundService.process(job.data.refundId as string);
}, { connection: redis });

refundWorker.on("failed", (job, error) => logger.error({ jobId: job?.id, err: error }, "Refund job failed"));