import { Queue } from "bullmq";
import { queueOptions } from "./queue-options.js";

export const shipmentQueue = new Queue("shipments", queueOptions);

export function enqueueShipmentSchedule(orderId: string) {
  return shipmentQueue.add("shipment:schedule", { orderId }, { jobId: `shipment-schedule:${orderId}` });
}