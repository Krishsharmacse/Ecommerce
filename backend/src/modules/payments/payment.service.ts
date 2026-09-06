import { enqueueOrderPaid } from "../../queues/index.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { RazorpayProvider } from "./providers/razorpay.provider.js";
import type { PaymentProvider } from "./providers/payment-provider.js";

type RazorpayOrder = { id: string; amount: number; currency: string };

export class PaymentService {
  constructor(private readonly provider: PaymentProvider = new RazorpayProvider()) {}

  async createOrder(userId: string, orderId: string): Promise<RazorpayOrder> {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: true } });
    if (!order || order.userId !== userId) throw new NotFoundError("Order not found");
    const existingPayment = order.payments.find((payment) => payment.method === "RAZORPAY");
    if (existingPayment?.razorpayOrderId) return { id: existingPayment.razorpayOrderId, amount: existingPayment.amountPaise, currency: "INR" };

    const gatewayOrder = await this.provider.createOrder({ amountPaise: order.totalPaise, receipt: order.id });
    await prisma.payment.create({ data: { orderId, method: "RAZORPAY", razorpayOrderId: gatewayOrder.providerOrderId, amountPaise: order.totalPaise, status: "CREATED" } });
    return { id: gatewayOrder.providerOrderId, amount: gatewayOrder.amountPaise, currency: gatewayOrder.currency };
  }

  async verify(userId: string, input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
    const lockKey = `payment:verify:${input.razorpayOrderId}`;
    const lock = await redis.set(lockKey, "1", "EX", 30, "NX");
    if (!lock) throw new ConflictError("Payment verification is already in progress");
    const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: input.razorpayOrderId }, include: { order: true } });
    try {
      if (!payment || payment.order.userId !== userId) throw new NotFoundError("Payment not found");
      if (payment.status === "CAPTURED") return payment;

      const verification = await this.provider.verifyPayment({ orderId: input.razorpayOrderId, paymentId: input.razorpayPaymentId, signature: input.razorpaySignature });
      if (!verification.valid) throw new ConflictError("Invalid payment signature");

      const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.payment.findUnique({ where: { id: payment.id } });
      if (!current || current.status === "CAPTURED") return current;
      const result = await tx.payment.update({ where: { id: payment.id }, data: { razorpayPaymentId: input.razorpayPaymentId, signature: input.razorpaySignature, status: "CAPTURED" } });
      await tx.order.update({ where: { id: payment.orderId }, data: { status: "CONFIRMED" } });
      return result;
    });
      if (updated) await enqueueOrderPaid(payment.orderId);
      return updated;
    } finally {
      await redis.del(lockKey);
    }
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    if (!this.provider.verifyWebhook(rawBody, signature)) throw new ConflictError("Invalid webhook signature");
    const event = JSON.parse(rawBody.toString("utf8")) as { id?: string; event: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
    if (!event.id) throw new ConflictError("Webhook event ID is missing");
    const existingEvent = await prisma.webhookEvent.findUnique({ where: { eventId: event.id } });
    if (existingEvent) return;
    await prisma.webhookEvent.create({ data: { eventId: event.id, eventType: event.event, payload: event as object } });
    if (event.event !== "payment.captured" || !event.payload?.payment?.entity?.order_id) { await prisma.webhookEvent.update({ where: { eventId: event.id }, data: { processedAt: new Date() } }); return; }
    const razorpayOrderId = event.payload.payment.entity.order_id;
    const payment = await prisma.payment.findUnique({ where: { razorpayOrderId } });
    if (!payment || payment.status === "CAPTURED") return;
    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { razorpayPaymentId: event.payload.payment.entity.id, status: "CAPTURED" } }),
      prisma.order.update({ where: { id: payment.orderId }, data: { status: "CONFIRMED" } })
    ]);
    await enqueueOrderPaid(payment.orderId);
    await prisma.webhookEvent.update({ where: { eventId: event.id }, data: { processedAt: new Date() } });
  }
}