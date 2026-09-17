import { Queue } from "bullmq";
import { queueOptions } from "./queue-options.js";

export const orderQueue = new Queue("orders", queueOptions);

export function enqueueOrderPaid(orderId: string) {
  return orderQueue.add("order:paid", { orderId }, { jobId: `order-paid:${orderId}` });
}