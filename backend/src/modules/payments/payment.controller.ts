import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { verifyPaymentSchema } from "../../utils/validators.js";
import { PaymentService } from "./payment.service.js";
import { RefundService } from "./refund.service.js";
import { paymentIdSchema, refundSchema } from "./refund.schema.js";

const paymentService = new PaymentService();
const refundService = new RefundService();

export async function createPaymentOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = z.string().cuid().parse(req.params.orderId);
    res.status(201).json({ success: true, payment: await paymentService.createOrder(req.user!.id, orderId) });
  } catch (error) { next(error); }
}

export async function verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = verifyPaymentSchema.parse(req.body);
    res.json({ success: true, payment: await paymentService.verify(req.user!.id, input) });
  } catch (error) { next(error); }
}

export async function paymentWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const signature = req.header("x-razorpay-signature");
    if (!signature || !Buffer.isBuffer(req.body)) { res.status(400).json({ success: false, message: "Raw webhook body and signature are required" }); return; }
    await paymentService.handleWebhook(req.body, signature);
    res.json({ success: true });
  } catch (error) { next(error); }
}

export async function requestRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { paymentId } = paymentIdSchema.parse(req.params);
    const input = refundSchema.parse(req.body);
    const idempotencyKey = req.header("Idempotency-Key");
    if (!idempotencyKey) { res.status(400).json({ success: false, message: "Idempotency-Key is required" }); return; }
    res.status(202).json({ success: true, refund: await refundService.request(req.user!.id, paymentId, input.amountPaise, input.reason, idempotencyKey) });
  } catch (error) { next(error); }
}