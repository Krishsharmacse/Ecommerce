import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { enqueueNotification } from "../queues/index.js";

export class NotificationService {
  findById(id: string) { return prisma.notification.findUnique({ where: { id } }); }
  async create(userId: string, type: NotificationType, title: string, message: string, data?: Prisma.InputJsonValue) {
    const notification = await prisma.notification.create({ data: { userId, type, title, message, data } });
    await enqueueNotification(notification.id);
    return notification;
  }

  list(userId: string, page: number, limit: number) {
    return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit });
  }

  markRead(userId: string, id: string) {
    return prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
  }
}