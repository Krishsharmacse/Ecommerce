import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { OrderRepository } from "./order.repository.js";

const orderRepository = new OrderRepository();

export class OrderService {
  async create(userId: string, shippingAddress: Record<string, unknown>, paymentMethod: "RAZORPAY" | "COD", idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing = await orderRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) throw new ConflictError("An order already exists for this idempotency key");
    }
    try {
      return await orderRepository.createFromCartTransaction(userId, shippingAddress, paymentMethod, idempotencyKey);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        throw new ConflictError("An order already exists for this idempotency key");
      }
      throw error;
    }
  }

  async getById(userId: string, id: string) {
    const order = await orderRepository.findById(id);
    if (!order || order.userId !== userId) throw new NotFoundError("Order not found");
    return order;
  }
}