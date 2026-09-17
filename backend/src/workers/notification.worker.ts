import { Worker } from "bullmq";
import { redis } from "../config/redis.js";
import { logger } from "../lib/logger.js";
import { wsPublish } from "../lib/ws.js";
import { NotificationService } from "../services/notification.service.js";
import { sseService } from "../services/sse.service.js";

const notificationService = new NotificationService();

export const notificationWorker = new Worker(
  "notifications",
  async (job) => {
    const notificationId = job.data.notificationId as string;
    const notification   = await notificationService.findById(notificationId);

    if (!notification) {
      logger.warn({ jobId: job.id, notificationId }, "Notification record not found");
      return;
    }

    // 1. SSE (legacy — kept for backwards compatibility)
    sseService.publish(notification.userId, notification.type, notification);

    // 2. WebSocket push (primary real-time channel)
    wsPublish(notification.userId, "notification.new", {
      id:        notification.id,
      type:      notification.type,
      title:     notification.title,
      message:   notification.message,
      data:      notification.data,
      createdAt: notification.createdAt,
    });

    logger.info({ jobId: job.id, notificationId }, "Notification published via WS + SSE");
  },
  { connection: redis }
);

notificationWorker.on("failed", (job, error) =>
  logger.error({ jobId: job?.id, err: error }, "Notification job failed")
);
