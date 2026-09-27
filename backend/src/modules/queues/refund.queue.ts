import { Queue } from "bullmq";
import { queueOptions } from "./queue-options.js";

export const refundQueue = new Queue("refunds", queueOptions);

export function enqueueRefund(refundId: string) {
  const safeJobId = `refund_${refundId.replace(/[:]/g, "_")}`;
  return refundQueue.add("refund:process", { refundId }, { jobId: safeJobId });
}