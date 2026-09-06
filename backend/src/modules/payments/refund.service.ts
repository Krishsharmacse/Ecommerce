import { PaymentStatus, RefundStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { enqueueRefund } from "../../queues/index.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { RazorpayProvider } from "./providers/razorpay.provider.js";

const paymentProvider = new RazorpayProvider();

export class RefundService {
  async request(userId: string, paymentId: string, amountPaise: number, reason: string | undefined, idempotencyKey: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
    if (!payment || payment.order.userId !== userId) throw new NotFoundError("Payment not found");
    if (payment.status !== PaymentStatus.CAPTURED || !payment.razorpayPaymentId) throw new ConflictError("Payment is not refundable");
    if (amountPaise <= 0 || amountPaise > payment.amountPaise) throw new ConflictError("Invalid refund amount");
    const existing = await prisma.refund.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;
    const refund = await prisma.refund.create({ data: { orderId: payment.orderId, paymentId, amountPaise, reason, idempotencyKey } });
    await enqueueRefund(refund.id);
    return refund;
  }

  async process(refundId: string) {
    const refund = await prisma.refund.findUnique({ where: { id: refundId }, include: { payment: true } });
    if (!refund || refund.status === RefundStatus.COMPLETED) return refund;
    await prisma.refund.update({ where: { id: refundId }, data: { status: RefundStatus.PROCESSING } });
    try {
      if (!refund.payment.razorpayPaymentId) throw new ConflictError("Provider payment ID is missing");
      const result = await paymentProvider.refund({ paymentId: refund.payment.razorpayPaymentId, amountPaise: refund.amountPaise, receipt: refund.orderId });
      const fullRefund = refund.amountPaise === refund.payment.amountPaise;
      return await prisma.$transaction([
        prisma.refund.update({ where: { id: refundId }, data: { status: RefundStatus.COMPLETED, razorpayRefundId: result.providerRefundId } }),
        prisma.payment.update({ where: { id: refund.paymentId }, data: { status: fullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED } }),
        ...(fullRefund ? [prisma.order.update({ where: { id: refund.orderId }, data: { status: "REFUNDED" } })] : [])
      ]).then((results) => results[0]);
    } catch (error) {
      await prisma.refund.update({ where: { id: refundId }, data: { status: RefundStatus.FAILED } });
      throw error;
    }
  }
}