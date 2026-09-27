import { Queue } from "bullmq";
import { queueOptions } from "./queue-options.js";

export const notificationQueue = new Queue("notifications", queueOptions);

export function enqueueNotification(notificationId: string) {
  const safeJobId = `notification_${notificationId.replace(/[:]/g, "_")}`;
  return notificationQueue.add("notification:send", { notificationId }, { jobId: safeJobId });
}