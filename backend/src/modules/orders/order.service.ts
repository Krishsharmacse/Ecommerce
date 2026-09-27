import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { OrderRepository } from "./order.repository.js";
import { prisma } from "../../lib/prisma.js";
import { wsPublish } from "../../lib/ws.js";
import { sendOrderConfirmationEmail } from "../../services/order-email.service.js";

const orderRepository = new OrderRepository();

export class OrderService {
  async create(userId: string, shippingAddress: Record<string, unknown>, paymentMethod: "RAZORPAY" | "COD", idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing = await orderRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) throw new ConflictError("An order already exists for this idempotency key");
    }
    try {
      const order = await orderRepository.createFromCartTransaction(userId, shippingAddress, paymentMethod, idempotencyKey);
      if (order.status === "CONFIRMED") {
        void sendOrderConfirmationEmail(order.id);
      }
      return order;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        throw new ConflictError("An order already exists for this idempotency key");
      }
      throw error;
    }
  }

  async list(userId: string, role: string) {
    if (role === "ADMIN") {
      return prisma.order.findMany({
        include: { items: true, payments: true, shipment: true, address: true },
        orderBy: { createdAt: "desc" },
      });
    }
    if (role === "VENDOR") {
      return prisma.order.findMany({
        where: {
          items: {
            some: {
              shop: { ownerId: userId },
            },
          },
        },
        include: { items: true, payments: true, shipment: true, address: true },
        orderBy: { createdAt: "desc" },
      });
    }
    return prisma.order.findMany({
      where: { userId },
      include: { items: true, payments: true, shipment: true, address: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(userId: string, role: string, id: string) {
    const order = await orderRepository.findById(id);
    if (!order) throw new NotFoundError("Order not found");
    if (role === "ADMIN" || order.userId === userId) return order;

    if (role === "VENDOR") {
      const vendorShop = await prisma.shop.findFirst({
        where: { ownerId: userId, id: { in: order.items.map((i) => i.shopId) } },
      });
      if (vendorShop) return order;
    }

    throw new NotFoundError("Order not found");
  }

  async cancel(userId: string, role: string, id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    // Throw NotFound to prevent IDOR enumeration
    if (!order || (order.userId !== userId && role !== "ADMIN")) {
      throw new NotFoundError("Order not found");
    }

    if (order.status !== "PENDING_PAYMENT" && order.status !== "CONFIRMED") {
      throw new ConflictError("Order cannot be cancelled in its current state");
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      return tx.order.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
    });

    wsPublish(order.userId, "order.cancelled", { orderId: order.id });
    return updated;
  }
}