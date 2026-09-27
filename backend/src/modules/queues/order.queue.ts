import { Queue } from "bullmq";
import { queueOptions } from "./queue-options.js";

export const orderQueue = new Queue("orders", queueOptions);

export function enqueueOrderPaid(orderId: string) {
  const safeJobId = `order-paid_${orderId.replace(/[:]/g, "_")}`;
  return orderQueue.add("order:paid", { orderId }, { jobId: safeJobId });
}