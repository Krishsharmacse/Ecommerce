import { enqueueOrderPaid, enqueueWebhookRetry } from "../../modules/queues/index.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../config/redis.js";
import { wsPublish } from "../../lib/ws.js";
import { RazorpayProvider } from "./providers/razorpay.provider.js";
import type { PaymentProvider } from "./providers/payment-provider.js";

type RazorpayOrder = { id: string; amount: number; currency: string };

// ─── Razorpay webhook event shape ────────────────────────────────────────────
interface RazorpayWebhookEvent {
  id?:         string;
  event:       string;
  created_at?: number;
  payload?: {
    payment?: {
      entity?: {
        id?:       string;
        order_id?: string;
      };
    };
    refund?: {
      entity?: {
        id?:        string;
        payment_id?: string;
        amount?:    number;
      };
    };
  };
}

export class PaymentService {
  constructor(private readonly provider: PaymentProvider = new RazorpayProvider()) {}

  // ─── Create Razorpay order ───────────────────────────────────────────────────
  async createOrder(userId: string, orderId: string): Promise<RazorpayOrder> {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: true } });
    if (!order || order.userId !== userId) throw new NotFoundError("Order not found");

    const existing = order.payments.find((p) => p.method === "RAZORPAY");
    if (existing?.razorpayOrderId) {
      return { id: existing.razorpayOrderId, amount: existing.amountPaise, currency: "INR" };
    }

    const gatewayOrder = await this.provider.createOrder({ amountPaise: order.totalPaise, receipt: order.id });
    await prisma.payment.create({
      data: {
        orderId,
        method:          "RAZORPAY",
        razorpayOrderId: gatewayOrder.providerOrderId,
        amountPaise:     order.totalPaise,
        status:          "CREATED",
      },
    });
    return { id: gatewayOrder.providerOrderId, amount: gatewayOrder.amountPaise, currency: gatewayOrder.currency };
  }

  // ─── Verify client-side payment signature ────────────────────────────────────
  async verify(
    userId: string,
    input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }
  ) {
    const lockKey = `payment:verify:${input.razorpayOrderId}`;
    const lock    = await redis.set(lockKey, "1", "EX", 30, "NX");
    if (!lock) throw new ConflictError("Payment verification is already in progress");

    const payment = await prisma.payment.findUnique({
      where:   { razorpayOrderId: input.razorpayOrderId },
      include: { order: true },
    });

    try {
      if (!payment || payment.order.userId !== userId) throw new NotFoundError("Payment not found");
      if (payment.status === "CAPTURED") return payment;

      const { valid } = await this.provider.verifyPayment({
        orderId:   input.razorpayOrderId,
        paymentId: input.razorpayPaymentId,
        signature: input.razorpaySignature,
      });
      if (!valid) throw new ConflictError("Invalid payment signature");

      const updated = await prisma.$transaction(async (tx) => {
        const current = await tx.payment.findUnique({ where: { id: payment.id } });
        if (!current || current.status === "CAPTURED") return current;
        const result = await tx.payment.update({
          where: { id: payment.id },
          data:  {
            razorpayPaymentId: input.razorpayPaymentId,
            signature:         input.razorpaySignature,
            status:            "CAPTURED",
          },
        });
        await tx.order.update({ where: { id: payment.orderId }, data: { status: "CONFIRMED" } });
        return result;
      });

      if (updated) {
        await enqueueOrderPaid(payment.orderId);
        // Real-time push: payment captured
        wsPublish(userId, "payment.captured", {
          orderId:   payment.orderId,
          paymentId: input.razorpayPaymentId,
        });
      }
      return updated;
    } finally {
      await redis.del(lockKey);
    }
  }

  // ─── Razorpay Webhook Handler ─────────────────────────────────────────────────
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.provider.verifyWebhook(rawBody, signature)) {
      throw new ConflictError("Invalid webhook signature");
    }

    const event = JSON.parse(rawBody.toString("utf8")) as RazorpayWebhookEvent;
    if (!event.id) throw new ConflictError("Webhook event ID is missing");

    // Replay protection: reject events older than 15 minutes (900 seconds) if created_at timestamp is present
    if (typeof event.created_at === "number") {
      const eventAge = Math.floor(Date.now() / 1000) - event.created_at;
      if (eventAge > 900) {
        logger.warn({ eventId: event.id, eventAge }, "webhook: dropped stale event exceeding 15m window");
        return;
      }
    }

    // Idempotency check
    const existing = await prisma.webhookEvent.findUnique({ where: { eventId: event.id } });
    if (existing?.processedAt) return; // already fully processed

    if (!existing) {
      await prisma.webhookEvent.create({
        data: { eventId: event.id, eventType: event.event, payload: event as object },
      });
    }

    try {
      switch (event.event) {
        case "payment.captured":
          await this.onPaymentCaptured(event);
          break;
        case "payment.failed":
          await this.onPaymentFailed(event);
          break;
        case "refund.processed":
          await this.onRefundProcessed(event);
          break;
        default:
          // Unknown event — mark processed and move on
          break;
      }

      await prisma.webhookEvent.update({
        where: { eventId: event.id },
        data:  { processedAt: new Date() },
      });
    } catch (err) {
      logger.error({ err, eventId: event.id, eventType: event.event }, "Webhook processing failed, enqueueing retry");
      // Enqueue for retry — BullMQ will handle backoff
      await enqueueWebhookRetry(event.id).catch((qErr) =>
        logger.error({ qErr }, "Failed to enqueue webhook retry")
      );
      throw err; // re-throw so Express returns 500 and Razorpay retries delivery
    }
  }

  // ─── Private event handlers ───────────────────────────────────────────────────
  private async onPaymentCaptured(event: RazorpayWebhookEvent): Promise<void> {
    const razorpayOrderId = event.payload?.payment?.entity?.order_id;
    const razorpayPaymentId = event.payload?.payment?.entity?.id;
    if (!razorpayOrderId) return;

    const payment = await prisma.payment.findUnique({ where: { razorpayOrderId }, include: { order: true } });
    if (!payment || payment.status === "CAPTURED") return;

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data:  { razorpayPaymentId, status: "CAPTURED" },
      }),
      prisma.order.update({ where: { id: payment.orderId }, data: { status: "CONFIRMED" } }),
    ]);

    await enqueueOrderPaid(payment.orderId);
    wsPublish(payment.order.userId, "payment.captured", { orderId: payment.orderId, razorpayPaymentId });
    logger.info({ orderId: payment.orderId }, "Webhook: payment.captured processed");
  }

  private async onPaymentFailed(event: RazorpayWebhookEvent): Promise<void> {
    const razorpayOrderId = event.payload?.payment?.entity?.order_id;
    if (!razorpayOrderId) return;

    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId },
      include: { order: { include: { items: true } } },
    });
    if (!payment || payment.status === "FAILED") return;

    await prisma.$transaction(async (tx) => {
      // Restore product stock that was deducted at order creation
      for (const item of payment.order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      await tx.order.update({ where: { id: payment.orderId }, data: { status: "CANCELLED" } });
    });

    wsPublish(payment.order.userId, "order.cancelled", { orderId: payment.orderId });
    wsPublish(payment.order.userId, "payment.failed", {
      orderId:         payment.orderId,
      razorpayOrderId,
    });
    logger.warn({ orderId: payment.orderId }, "Webhook: payment.failed processed and inventory restored");
  }

  private async onRefundProcessed(event: RazorpayWebhookEvent): Promise<void> {
    const refundId  = event.payload?.refund?.entity?.id;
    const paymentId = event.payload?.refund?.entity?.payment_id;
    if (!refundId || !paymentId) return;

    const refund = await prisma.refund.findFirst({ where: { razorpayRefundId: refundId } });
    if (refund) {
      await prisma.refund.update({ where: { id: refund.id }, data: { status: "COMPLETED" } });
    }

    // Push WS to affected user via payment → order → user chain
    const payment = await prisma.payment.findUnique({ where: { razorpayPaymentId: paymentId }, include: { order: true } });
    if (payment) {
      wsPublish(payment.order.userId, "refund.processed", { orderId: payment.orderId, refundId });
    }
    logger.info({ refundId }, "Webhook: refund.processed handled");
  }
}