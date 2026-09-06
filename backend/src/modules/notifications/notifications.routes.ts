import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { listNotifications, markNotificationRead, notificationStream } from "./notifications.controller.js";

export const notificationsRoutes = Router();
notificationsRoutes.use(authenticate);
notificationsRoutes.get("/", listNotifications);
notificationsRoutes.patch("/:id/read", markNotificationRead);
notificationsRoutes.get("/stream", notificationStream);