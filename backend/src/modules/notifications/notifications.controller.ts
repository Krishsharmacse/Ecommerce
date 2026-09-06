import type { NextFunction, Request, Response } from "express";
import { NotificationService } from "../../services/notification.service.js";
import { sseService } from "../../services/sse.service.js";
import { notificationIdSchema } from "./notifications.schema.js";

const notificationService = new NotificationService();
export async function listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> { try { res.json({ success: true, notifications: await notificationService.list(req.user!.id, 1, 50) }); } catch (error) { next(error); } }
export async function markNotificationRead(req: Request, res: Response, next: NextFunction): Promise<void> { try { const { id } = notificationIdSchema.parse(req.params); await notificationService.markRead(req.user!.id, id); res.json({ success: true }); } catch (error) { next(error); } }
export function notificationStream(req: Request, res: Response): void { res.status(200).set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }); res.flushHeaders(); res.write(`event: connected\ndata: ${JSON.stringify({ userId: req.user!.id })}\n\n`); sseService.add(req.user!.id, res); }