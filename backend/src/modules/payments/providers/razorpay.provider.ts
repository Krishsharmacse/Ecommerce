import crypto from "node:crypto";
import { razorpay } from "../../../config/razorpay.js";
import { env } from "../../../config/env.js";
import type { PaymentProvider, CreatePaymentOrderInput, CreatePaymentOrderResult, VerifyPaymentInput, VerifyPaymentResult, RefundInput, RefundResult } from "./payment-provider.js";

export class RazorpayProvider implements PaymentProvider {
  async createOrder(input: CreatePaymentOrderInput): Promise<CreatePaymentOrderResult> {
    const order = await razorpay.orders.create({ amount: input.amountPaise, currency: "INR", receipt: input.receipt });
    return { providerOrderId: order.id, amountPaise: Number(order.amount), currency: order.currency };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const expected = crypto.createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(`${input.orderId}|${input.paymentId}`).digest("hex");
    const valid = expected.length === input.signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
    return { valid };
  }

  verifyWebhook(rawBody: Buffer, signature: string): boolean {
    const expected = crypto.createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
    return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const refund = await razorpay.payments.refund(input.paymentId, { amount: input.amountPaise, notes: { receipt: input.receipt } });
    return { providerRefundId: refund.id };
  }
}