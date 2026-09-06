import { prisma } from "../../lib/prisma.js";

export class OrderRepository {
  createFromCartTransaction(userId: string, shippingAddress: Record<string, unknown>, paymentMethod: "RAZORPAY" | "COD", idempotencyKey?: string) {
    return prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({ where: { userId }, include: { items: { include: { product: true } } } });
      if (!cart || !cart.items.length) throw new Error("Cart is empty");
      let totalPaise = 0;
      const orderItems: Array<{ productId: string; shopId: string; productName: string; quantity: number; unitPricePaise: number; subtotalPaise: number }> = [];

      for (const cartItem of cart.items) {
        const product = cartItem.product;
        if (product.status !== "ACTIVE" || !product.isActive) throw new Error(`Product ${product.name} is unavailable`);

        const updated = await tx.product.updateMany({
          where: { id: product.id, status: "ACTIVE", isActive: true, stock: { gte: cartItem.quantity } },
          data: { stock: { decrement: cartItem.quantity } }
        });
        if (updated.count !== 1) throw new Error(`Insufficient stock for ${product.name}`);

        totalPaise += product.pricePaise * cartItem.quantity;
        orderItems.push({ productId: product.id, shopId: product.shopId, productName: product.name, quantity: cartItem.quantity, unitPricePaise: product.pricePaise, subtotalPaise: product.pricePaise * cartItem.quantity });
      }

      const order = await tx.order.create({
        data: {
          user: { connect: { id: userId } },
          paymentMethod,
          status: paymentMethod === "COD" ? "CONFIRMED" : "PENDING_PAYMENT",
          subtotalPaise: totalPaise,
          totalPaise,
          idempotencyKey,
          address: {
            create: {
              fullName: String(shippingAddress.fullName ?? ""),
              phone: String(shippingAddress.phone ?? ""),
              line1: String(shippingAddress.line1 ?? ""),
              line2: shippingAddress.line2 ? String(shippingAddress.line2) : undefined,
              city: String(shippingAddress.city ?? ""),
              state: String(shippingAddress.state ?? ""),
              postalCode: String(shippingAddress.postalCode ?? ""),
              country: String(shippingAddress.country ?? "IN")
            }
          },
          items: { create: orderItems },
          payments: { create: { method: paymentMethod, amountPaise: totalPaise, status: "CREATED" } }
        },
        include: { items: true }
      });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return order;
    });
  }

  findById(id: string) {
    return prisma.order.findUnique({ where: { id }, include: { items: true, payments: true, shipment: true } });
  }

  findByIdempotencyKey(idempotencyKey: string) {
    return prisma.order.findUnique({ where: { idempotencyKey } });
  }
}