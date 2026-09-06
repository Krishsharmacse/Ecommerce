import { Queue } from "bullmq";
import { queueOptions } from "./queue-options.js";

export const notificationQueue = new Queue("notifications", queueOptions);

export function enqueueNotification(notificationId: string) {
  return notificationQueue.add("notification:send", { notificationId }, { jobId: `notification:${notificationId}` });
}