import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { createPaymentOrder, paymentWebhook, requestRefund, verifyPayment } from "./payment.controller.js";

export const paymentRoutes = Router();
paymentRoutes.post("/webhook", paymentWebhook);
paymentRoutes.post("/create-order", authenticate, createPaymentOrder);
paymentRoutes.post("/:orderId/order", authenticate, createPaymentOrder);
paymentRoutes.post("/verify", authenticate, verifyPayment);
paymentRoutes.post("/:paymentId/refund", authenticate, requestRefund);