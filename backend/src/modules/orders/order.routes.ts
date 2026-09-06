import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { createOrder, getOrder } from "./order.controller.js";

export const orderRoutes = Router();
orderRoutes.use(authenticate);
orderRoutes.post("/", createOrder);
orderRoutes.get("/:id", getOrder);