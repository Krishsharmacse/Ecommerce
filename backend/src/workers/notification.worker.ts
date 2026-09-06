import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import { NotificationService } from "../services/notification.service.js";
import { sseService } from "../services/sse.service.js";

const notificationService = new NotificationService();

export const notificationWorker = new Worker("notifications", async (job) => {
  const notification = await notificationService.findById(job.data.notificationId as string);
  if (notification) sseService.publish(notification.userId, notification.type, notification);
  logger.info({ jobId: job.id, notificationId: job.data.notificationId }, "Notification published");
}, { connection: redis });

notificationWorker.on("failed", (job, error) => logger.error({ jobId: job?.id, err: error }, "Notification job failed"));