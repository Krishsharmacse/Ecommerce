import { Queue } from "bullmq";
import { queueOptions } from "./queue-options.js";

export const shipmentQueue = new Queue("shipments", queueOptions);

export function enqueueShipmentSchedule(orderId: string) {
  const safeJobId = `shipment-schedule_${orderId.replace(/[:]/g, "_")}`;
  return shipmentQueue.add("shipment:schedule", { orderId }, { jobId: safeJobId });
}