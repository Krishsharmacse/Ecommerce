import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { createOrder, getOrder, cancelOrder, listOrders } from "./order.controller.js";

export const orderRoutes = Router();
orderRoutes.use(authenticate);
orderRoutes.get("/", listOrders);
orderRoutes.post("/", createOrder);
orderRoutes.get("/:id", getOrder);
orderRoutes.post("/:id/cancel", cancelOrder);